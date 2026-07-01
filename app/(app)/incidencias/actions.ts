"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import {
  isStaff,
  canMoveCard,
  ALL_STATUSES,
  STATUS_LABELS,
  KIND_LABELS,
  initialStatusFor,
  doneStatusFor,
  isPauseTransition,
  PRIORITY_CHANGE_ACTION,
  STATUS_PAUSE_ACTION,
} from "@/lib/domain";
import type { IncidentStatus, TicketKind } from "@/lib/supabase/types";
import {
  commentSchema,
  incidentSchema,
  resolveSchema,
  priorityChangeSchema,
  triageSchema,
} from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { sanitizeRichText, htmlToText } from "@/lib/sanitize";
import { notifyDeveloper } from "@/lib/email/notify-developer";
import { analyzeIncidentImages, triageIncident, embedText } from "@/lib/ai";
import { retrieveContext } from "@/lib/ai/retrieval";
import { notify } from "@/lib/notifications";

type AttachmentInput = {
  path: string;
  name: string;
  mime: string;
  size: number;
};

export type IncidentFormState = { error?: string };

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 dias

export async function createIncidentAction(
  _prev: IncidentFormState,
  formData: FormData,
): Promise<IncidentFormState> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const parsed = incidentSchema.safeParse({
    kind: formData.get("kind") ?? "incident",
    title: formData.get("title"),
    description: formData.get("description"),
    systemId: formData.get("systemId") ?? "",
    companyId: formData.get("companyId") ?? "",
    category: formData.get("category") ?? "",
    stakeholderArea: formData.get("stakeholderArea") ?? "",
    benefit: formData.get("benefit") ?? "",
    priority: formData.get("priority"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const kind = parsed.data.kind;

  // Descrição vem do editor rico: sanitiza o HTML (grava limpo) e extrai o texto
  // puro (validar "vazio" e alimentar a IA/embedding sem tags).
  const descriptionHtml = sanitizeRichText(parsed.data.description);
  const descriptionText = htmlToText(descriptionHtml);
  if (descriptionText.length < 3) {
    return { error: "Descreva o problema." };
  }
  parsed.data.description = descriptionText; // IA/embedding usam o texto puro

  const benefitHtml = parsed.data.benefit ? sanitizeRichText(parsed.data.benefit) : "";

  let attachments: AttachmentInput[] = [];
  try {
    const raw = formData.get("attachments");
    if (typeof raw === "string" && raw) attachments = JSON.parse(raw);
  } catch {
    attachments = [];
  }

  const { data: incident, error } = await supabase
    .from("incidents")
    .insert({
      kind,
      status: initialStatusFor(kind),
      title: parsed.data.title,
      description: descriptionHtml,
      system_id: parsed.data.systemId || null,
      company_id: parsed.data.companyId || null,
      category: parsed.data.category || null,
      stakeholder_area: parsed.data.stakeholderArea || null,
      benefit: htmlToText(benefitHtml) ? benefitHtml : null,
      priority: parsed.data.priority,
      created_by: profile.id,
    })
    .select("id, ref")
    .single();

  if (error || !incident) {
    return { error: "Não foi possível criar a solicitação. Tente novamente." };
  }

  // Registra anexos
  if (attachments.length > 0) {
    await supabase.from("incident_attachments").insert(
      attachments.map((a) => ({
        incident_id: incident.id,
        storage_path: a.path,
        file_name: a.name,
        mime_type: a.mime,
        size_bytes: a.size,
        uploaded_by: profile.id,
      })),
    );
  }

  const basePath = kind === "improvement" ? "/melhorias" : "/incidencias";
  const { data: parsedData } = parsed;

  // PÓS-PROCESSAMENTO em background (after): URLs assinadas + IA (embedding,
  // análise de imagens, triagem) + e-mail à empresa parceira. Roda DEPOIS da
  // resposta, então a criação do chamado é instantânea — a OpenAI/e-mail não
  // travam o redirect. O ai_analysis aparece em seguida (realtime/refresh).
  after(async () => {
    const admin = createAdminClient();
    try {
      // URLs assinadas dos anexos de imagem (para IA e e-mail).
      const imageUrls: string[] = [];
      for (const a of attachments.filter((a) => a.mime.startsWith("image/"))) {
        const { data } = await admin.storage
          .from("attachments")
          .createSignedUrl(a.path, SIGNED_URL_TTL);
        if (data?.signedUrl) imageUrls.push(data.signedUrl);
      }

      // IA: embedding + análise de imagens + triagem unificada.
      const { embedding, incidents: similar, tutorials } = await retrieveContext(
        admin,
        `${parsedData.title}\n\n${parsedData.description}`,
        { excludeId: incident.id, ftsQuery: parsedData.title },
      );

      const [imageAnalysis, triage] = await Promise.all([
        analyzeIncidentImages(imageUrls, parsedData),
        triageIncident(parsedData, { similar, tutorials }),
      ]);

      const blocks = [
        triage,
        imageAnalysis && `🖼️ Análise das imagens:\n${imageAnalysis}`,
      ].filter(Boolean);

      const update: {
        embedding?: string;
        ai_analysis?: string;
        ai_suggested_refs?: number[];
      } = {};
      if (embedding) update.embedding = `[${embedding.join(",")}]`;
      if (blocks.length) update.ai_analysis = blocks.join("\n\n");
      const refs = similar.filter((s) => s.resolution).map((s) => s.ref);
      if (triage && refs.length) update.ai_suggested_refs = refs;
      if (Object.keys(update).length > 0) {
        await admin.from("incidents").update(update).eq("id", incident.id);
      }

      // TRIAGEM: avisa os administradores (in-app + e-mail) para analisarem e
      // aceitarem/recusarem. O desenvolvedor do sistema só é acionado DEPOIS do
      // aceite (ver triageTicketAction → notifyDeveloper). Inclui possível
      // duplicata apontada pela IA, para o admin decidir.
      const { data: admins } = await admin
        .from("profiles")
        .select("id, email, full_name")
        .eq("role", "admin")
        .eq("status", "active");

      const dup = similar[0];
      const dupNote = dup ? ` Possível duplicata: #${dup.ref} — ${dup.title}.` : "";
      const kindLabel = KIND_LABELS[kind];
      const link = `${basePath}/${incident.id}`;
      for (const adm of admins ?? []) {
        await notify({
          userId: adm.id,
          incidentId: incident.id,
          type: "assigned",
          title: `Nova ${kindLabel} para análise: #${incident.ref}`,
          body: `${parsedData.title} — aberto por ${profile.full_name || profile.email}.${dupNote} Acesse para aceitar ou recusar.`,
          link,
          email: {
            to: adm.email,
            ref: incident.ref,
            incidentTitle: parsedData.title,
            actorName: profile.full_name || profile.email,
          },
        });
      }
    } catch (err) {
      console.error("[incident] pós-processamento:", err);
    }
  });

  revalidatePath(basePath);
  redirect(`${basePath}/${incident.id}`);
}

/** Dados mínimos das partes de um chamado, para roteamento de notificações. */
async function loadParties(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
) {
  const { data } = await supabase
    .from("incidents")
    .select("ref, title, kind, created_by, assigned_to")
    .eq("id", id)
    .single();
  return data;
}

/** Lê contato (e-mail + nome) de um usuário via service role. */
async function loadContact(
  id: string | null,
): Promise<{ email: string; name: string } | null> {
  if (!id) return null;
  try {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("email, full_name")
      .eq("id", id)
      .single();
    if (!data) return null;
    return { email: data.email, name: data.full_name || data.email };
  } catch {
    return null;
  }
}

function ticketPath(kind: TicketKind, id: string) {
  return `${kind === "improvement" ? "/melhorias" : "/incidencias"}/${id}`;
}

export async function addCommentAction(
  _prev: IncidentFormState,
  formData: FormData,
): Promise<IncidentFormState> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const parsed = commentSchema.safeParse({
    incidentId: formData.get("incidentId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: "Comentário inválido." };

  const bodyHtml = sanitizeRichText(parsed.data.body);
  const bodyText = htmlToText(bodyHtml);
  if (bodyText.length < 1) return { error: "Comentário vazio." };

  const { error } = await supabase.from("incident_comments").insert({
    incident_id: parsed.data.incidentId,
    author_id: profile.id,
    body: bodyHtml,
  });
  if (error) return { error: "Não foi possível comentar." };

  // Notifica a "outra parte": se quem comentou foi o solicitante, avisa o
  // responsável; caso contrário, avisa o solicitante.
  try {
    const parties = await loadParties(supabase, parsed.data.incidentId);
    if (parties) {
      const recipientId =
        profile.id === parties.created_by
          ? parties.assigned_to
          : parties.created_by;
      if (recipientId && recipientId !== profile.id) {
        const contact = await loadContact(recipientId);
        const excerpt =
          bodyText.length > 140 ? `${bodyText.slice(0, 140)}…` : bodyText;
        await notify({
          userId: recipientId,
          incidentId: parsed.data.incidentId,
          type: "comment",
          title: `Novo comentário no #${parties.ref}`,
          body: `${profile.full_name || profile.email} comentou: "${excerpt}"`,
          link: ticketPath(parties.kind, parsed.data.incidentId),
          email: contact
            ? {
                to: contact.email,
                ref: parties.ref,
                incidentTitle: parties.title,
                actorName: profile.full_name || profile.email,
              }
            : undefined,
        });
      }
    }
  } catch (err) {
    console.error("[comment] notify:", err);
  }

  revalidateTicket(parsed.data.incidentId);
  return {};
}

/** Revalida ambos os namespaces (incidências e melhorias) do ticket. */
function revalidateTicket(id: string) {
  revalidatePath(`/incidencias/${id}`);
  revalidatePath(`/melhorias/${id}`);
}

export async function assignToMeAction(formData: FormData) {
  const profile = await requireProfile();
  if (!isStaff(profile.role)) return;
  const id = String(formData.get("incidentId"));
  const supabase = await createClient();
  await supabase
    .from("incidents")
    .update({ assigned_to: profile.id, status: "in_progress" })
    .eq("id", id);

  try {
    const parties = await loadParties(supabase, id);
    if (parties && parties.created_by !== profile.id) {
      const contact = await loadContact(parties.created_by);
      await notify({
        userId: parties.created_by,
        incidentId: id,
        type: "assigned",
        title: `Chamado #${parties.ref} assumido`,
        body: `${profile.full_name || profile.email} assumiu o seu chamado e iniciou o atendimento.`,
        link: ticketPath(parties.kind, id),
        email: contact
          ? {
              to: contact.email,
              ref: parties.ref,
              incidentTitle: parties.title,
              actorName: profile.full_name || profile.email,
            }
          : undefined,
      });
    }
  } catch (err) {
    console.error("[assign] notify:", err);
  }

  revalidateTicket(id);
}

export async function updateStatusAction(formData: FormData) {
  const profile = await requireProfile();
  // Equipe interna ou parceiro. O parceiro só consegue afetar melhorias da
  // própria empresa (RLS) e só o campo status (trigger guard_incident_fields).
  if (!canMoveCard(profile.role)) return;
  const id = String(formData.get("incidentId"));
  const status = String(formData.get("status")) as IncidentStatus;
  if (!ALL_STATUSES.includes(status)) return;
  const supabase = await createClient();

  // Detecta PAUSA (melhoria saindo de "em desenvolvimento" p/ etapa anterior):
  // exige motivo e registra na trilha para a diretoria ver o porquê do atraso.
  const reason = String(formData.get("reason") ?? "").trim();
  const { data: before } = await supabase
    .from("incidents")
    .select("status, ref, title, kind")
    .eq("id", id)
    .single();
  const pausing =
    !!before && before.kind === "improvement" &&
    isPauseTransition(before.status, status);
  if (pausing && reason.length < 3) return; // motivo obrigatório na pausa

  await supabase.from("incidents").update({ status }).eq("id", id);

  if (pausing && before) {
    await logAudit({
      actorId: profile.id,
      actorEmail: profile.email,
      action: STATUS_PAUSE_ACTION,
      targetId: id,
      details: {
        ref: before.ref,
        title: before.title,
        kind: before.kind,
        from: before.status,
        to: status,
        reason,
      },
    });
  }

  try {
    const parties = await loadParties(supabase, id);
    if (parties && parties.created_by !== profile.id) {
      const contact = await loadContact(parties.created_by);
      await notify({
        userId: parties.created_by,
        incidentId: id,
        type: "status_change",
        title: `Status atualizado: ${STATUS_LABELS[status]}`,
        body: `Seu chamado #${parties.ref} — "${parties.title}" — agora está: ${STATUS_LABELS[status]}.`,
        link: ticketPath(parties.kind, id),
        email: contact
          ? {
              to: contact.email,
              ref: parties.ref,
              incidentTitle: parties.title,
              actorName: profile.full_name || profile.email,
            }
          : undefined,
      });
    }
  } catch (err) {
    console.error("[status] notify:", err);
  }

  revalidateTicket(id);
}

/**
 * Repriorização de uma melhoria com MOTIVO obrigatório. Registra de→para na
 * trilha (audit_log) para a diretoria ver por que algo passou na frente.
 * Equipe ou parceiro (RLS + guard garantem o escopo por empresa).
 */
export async function updatePriorityAction(formData: FormData) {
  const profile = await requireProfile();
  if (!canMoveCard(profile.role)) return;

  const parsed = priorityChangeSchema.safeParse({
    incidentId: formData.get("incidentId"),
    priority: formData.get("priority"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("incidents")
    .select("priority, ref, title, kind")
    .eq("id", parsed.data.incidentId)
    .single();
  if (!before || before.priority === parsed.data.priority) return;

  await supabase
    .from("incidents")
    .update({ priority: parsed.data.priority })
    .eq("id", parsed.data.incidentId);

  await logAudit({
    actorId: profile.id,
    actorEmail: profile.email,
    action: PRIORITY_CHANGE_ACTION,
    targetId: parsed.data.incidentId,
    details: {
      ref: before.ref,
      title: before.title,
      kind: before.kind,
      from: before.priority,
      to: parsed.data.priority,
      reason: parsed.data.reason,
    },
  });

  revalidateTicket(parsed.data.incidentId);
}

/**
 * TRIAGEM do admin: aceitar ou recusar um chamado recém-aberto. Só admin.
 *  • aceitar → melhoria vira "aprovada" / bug vira "em andamento" e o
 *    DESENVOLVEDOR do sistema é acionado por e-mail (notifyDeveloper).
 *  • recusar → melhoria "recusada" / bug "fechado", com MOTIVO obrigatório
 *    (vira comentário e é avisado ao solicitante).
 * Idempotente: só age enquanto o chamado está no status inicial (aguardando
 * triagem), evitando e-mail/efeito duplicado.
 */
export async function triageTicketAction(
  _prev: IncidentFormState,
  formData: FormData,
): Promise<IncidentFormState> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Apenas administradores." };

  const parsed = triageSchema.safeParse({
    incidentId: formData.get("incidentId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { incidentId, decision } = parsed.data;
  // Nota vem do editor rico: sanitiza o HTML e extrai o texto puro (para
  // notificações/e-mail do solicitante, que não renderizam HTML).
  const noteHtml = parsed.data.note ? sanitizeRichText(parsed.data.note) : "";
  const noteText = htmlToText(noteHtml);
  const hasNote = noteText.length > 0;

  const supabase = await createClient();
  const { data: inc } = await supabase
    .from("incidents")
    .select("ref, title, kind, status, created_by")
    .eq("id", incidentId)
    .single();
  if (!inc) return { error: "Chamado não encontrado." };
  if (inc.status !== initialStatusFor(inc.kind)) {
    return { error: "Este chamado já foi triado." };
  }

  const accepted = decision === "accept";
  if (!accepted && !hasNote) {
    return { error: "Informe o motivo da recusa." };
  }
  const isImprovement = inc.kind === "improvement";
  const newStatus: IncidentStatus = accepted
    ? isImprovement
      ? "approved"
      : "in_progress"
    : isImprovement
      ? "rejected"
      : "closed";

  await supabase.from("incidents").update({ status: newStatus }).eq("id", incidentId);

  // Registra a decisão como comentário (aceite: observação opcional; recusa:
  // motivo obrigatório). Corpo em HTML: rótulo + a especificação/motivo.
  if (hasNote) {
    const label = accepted ? "Triagem — aceito" : "Triagem — recusado";
    await supabase.from("incident_comments").insert({
      incident_id: incidentId,
      author_id: profile.id,
      body: `<p><strong>${label}</strong></p>${noteHtml}`,
    });
  }

  // Aceite → aciona o desenvolvedor do sistema (com a especificação em HTML).
  if (accepted) {
    await notifyDeveloper(incidentId, hasNote ? noteHtml : undefined);
  }

  // Notifica o solicitante da decisão.
  try {
    if (inc.created_by !== profile.id) {
      const contact = await loadContact(inc.created_by);
      const headline = accepted
        ? `Chamado #${inc.ref} aceito`
        : `Chamado #${inc.ref} recusado`;
      await notify({
        userId: inc.created_by,
        incidentId,
        type: "status_change",
        title: headline,
        body: accepted
          ? `Seu chamado "${inc.title}" foi aceito e encaminhado ao desenvolvedor.${noteText ? ` Observação: ${noteText}` : ""}`
          : `Seu chamado "${inc.title}" foi recusado. Motivo: ${noteText}`,
        link: ticketPath(inc.kind, incidentId),
        email: contact
          ? {
              to: contact.email,
              ref: inc.ref,
              incidentTitle: inc.title,
              actorName: profile.full_name || profile.email,
            }
          : undefined,
      });
    }
  } catch (err) {
    console.error("[triage] notify:", err);
  }

  revalidateTicket(incidentId);
  return {};
}

export async function resolveIncidentAction(
  _prev: IncidentFormState,
  formData: FormData,
): Promise<IncidentFormState> {
  const profile = await requireProfile();
  if (!isStaff(profile.role)) return { error: "Sem permissão." };

  const parsed = resolveSchema.safeParse({
    incidentId: formData.get("incidentId"),
    resolution: formData.get("resolution"),
  });
  if (!parsed.success) return { error: "Descreva a solução aplicada." };

  const resolutionHtml = sanitizeRichText(parsed.data.resolution);
  const resolutionText = htmlToText(resolutionHtml);
  if (resolutionText.length < 3) return { error: "Descreva a solução aplicada." };

  const kind = (String(formData.get("kind")) as TicketKind) || "incident";
  const doneStatus = doneStatusFor(kind);
  const supabase = await createClient();
  const { error } = await supabase
    .from("incidents")
    .update({
      resolution: resolutionHtml,
      status: doneStatus,
    })
    .eq("id", parsed.data.incidentId);
  if (error) return { error: "Não foi possível registrar a conclusão." };

  // Anexos da solução (vídeo/imagens demonstrando como foi resolvido).
  try {
    const raw = formData.get("attachments");
    if (typeof raw === "string" && raw) {
      const atts: AttachmentInput[] = JSON.parse(raw);
      if (atts.length > 0) {
        await supabase.from("incident_attachments").insert(
          atts.map((a) => ({
            incident_id: parsed.data.incidentId,
            storage_path: a.path,
            file_name: a.name,
            mime_type: a.mime,
            size_bytes: a.size,
            uploaded_by: profile.id,
          })),
        );
      }
    }
  } catch (err) {
    console.error("[resolve] anexos:", err);
  }

  // Recalcula o embedding incluindo a solução (melhora a busca semântica na
  // base de conhecimento) e notifica o solicitante. Best-effort.
  try {
    const parties = await loadParties(supabase, parsed.data.incidentId);

    const embedding = await embedText(
      `${parties?.title ?? ""}\n\n${resolutionText}`,
    );
    if (embedding) {
      await createAdminClient()
        .from("incidents")
        .update({ embedding: `[${embedding.join(",")}]` })
        .eq("id", parsed.data.incidentId);
    }

    if (parties && parties.created_by !== profile.id) {
      const contact = await loadContact(parties.created_by);
      const isImprovement = kind === "improvement";
      await notify({
        userId: parties.created_by,
        incidentId: parsed.data.incidentId,
        type: "resolved",
        title: isImprovement
          ? `Chamado #${parties.ref} entregue`
          : `Chamado #${parties.ref} resolvido`,
        body: `${profile.full_name || profile.email} ${isImprovement ? "concluiu a entrega" : "registrou a solução"} do seu chamado "${parties.title}".`,
        link: ticketPath(kind, parsed.data.incidentId),
        email: contact
          ? {
              to: contact.email,
              ref: parties.ref,
              incidentTitle: parties.title,
              actorName: profile.full_name || profile.email,
            }
          : undefined,
      });
    }
  } catch (err) {
    console.error("[resolve] notify/embedding:", err);
  }

  revalidateTicket(parsed.data.incidentId);
  return {};
}

/**
 * Registra o feedback (👍/👎) da equipe sobre a sugestão de IA do chamado.
 * Alimenta o aprendizado: soluções repetidamente marcadas como inúteis deixam
 * de ser sugeridas (ver `unhelpful_refs` em lib/ai/retrieval.ts). Só equipe.
 */
export async function rateAiSuggestionAction(formData: FormData) {
  const profile = await requireProfile();
  if (!isStaff(profile.role)) return;
  const id = String(formData.get("incidentId"));
  const helpful = String(formData.get("helpful")) === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("ai_suggestion_feedback")
    .upsert(
      { incident_id: id, user_id: profile.id, helpful },
      { onConflict: "incident_id,user_id" },
    );

  revalidateTicket(id);
}
