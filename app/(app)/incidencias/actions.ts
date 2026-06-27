"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import {
  isStaff,
  ALL_STATUSES,
  STATUS_LABELS,
  PRIORITY_LABELS,
  KIND_LABELS,
  initialStatusFor,
  doneStatusFor,
} from "@/lib/domain";
import type { IncidentStatus, TicketKind } from "@/lib/supabase/types";
import {
  commentSchema,
  incidentSchema,
  resolveSchema,
} from "@/lib/validations";
import { sendIncidentEmail } from "@/lib/email/send";
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
      description: parsed.data.description,
      system_id: parsed.data.systemId || null,
      company_id: parsed.data.companyId || null,
      category: parsed.data.category || null,
      stakeholder_area: parsed.data.stakeholderArea || null,
      benefit: parsed.data.benefit || null,
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

  // URLs assinadas dos anexos de imagem (para IA e e-mail)
  const imagePaths = attachments
    .filter((a) => a.mime.startsWith("image/"))
    .map((a) => a.path);
  const imageUrls: string[] = [];
  for (const path of imagePaths) {
    const { data } = await supabase.storage
      .from("attachments")
      .createSignedUrl(path, SIGNED_URL_TTL);
    if (data?.signedUrl) imageUrls.push(data.signedUrl);
  }

  // IA: embedding (busca semântica) + análise de imagens + TRIAGEM unificada
  // (dúvida de uso vs defeito + solução reaproveitável numa só chamada à LLM).
  // Best-effort — não bloqueia o fluxo de criação.
  try {
    const { embedding, incidents: similar, tutorials } = await retrieveContext(
      supabase,
      `${parsed.data.title}\n\n${parsed.data.description}`,
      { excludeId: incident.id, ftsQuery: parsed.data.title },
    );

    const [imageAnalysis, triage] = await Promise.all([
      analyzeIncidentImages(imageUrls, parsed.data),
      triageIncident(parsed.data, { similar, tutorials }),
    ]);

    const blocks = [
      triage,
      imageAnalysis && `🖼️ Análise das imagens:\n${imageAnalysis}`,
    ].filter(Boolean);

    // Campos calculados no servidor — gravados via service role para não
    // esbarrar nas restrições de RLS de atualização do solicitante.
    const update: {
      embedding?: string;
      ai_analysis?: string;
      ai_suggested_refs?: number[];
    } = {};
    if (embedding) update.embedding = `[${embedding.join(",")}]`;
    if (blocks.length) update.ai_analysis = blocks.join("\n\n");
    // Refs que embasaram a triagem — usadas pelo aprendizado por feedback.
    const refs = similar.filter((s) => s.resolution).map((s) => s.ref);
    if (triage && refs.length) update.ai_suggested_refs = refs;
    if (Object.keys(update).length > 0) {
      await createAdminClient()
        .from("incidents")
        .update(update)
        .eq("id", incident.id);
    }
  } catch (err) {
    console.error("[incident] IA:", err);
  }

  const basePath = kind === "improvement" ? "/melhorias" : "/incidencias";

  // E-mail para a empresa parceira, se direcionado
  if (parsed.data.companyId) {
    try {
      const { data: company } = await supabase
        .from("companies")
        .select("name, contact_emails")
        .eq("id", parsed.data.companyId)
        .single();
      const { data: system } = parsed.data.systemId
        ? await supabase
            .from("systems")
            .select("name")
            .eq("id", parsed.data.systemId)
            .single()
        : { data: null };

      if (company && company.contact_emails?.length) {
        await sendIncidentEmail(company.contact_emails, {
          ref: incident.ref,
          kindLabel: KIND_LABELS[kind],
          title: parsed.data.title,
          description: parsed.data.description,
          systemName: system?.name ?? null,
          priorityLabel: PRIORITY_LABELS[parsed.data.priority],
          requesterName: profile.full_name || profile.email,
          companyName: company.name,
          url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}${basePath}/${incident.id}`,
          imageUrls,
        });
      }
    } catch (err) {
      console.error("[incident] e-mail:", err);
    }
  }

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

  const { error } = await supabase.from("incident_comments").insert({
    incident_id: parsed.data.incidentId,
    author_id: profile.id,
    body: parsed.data.body,
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
          parsed.data.body.length > 140
            ? `${parsed.data.body.slice(0, 140)}…`
            : parsed.data.body;
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
  if (!isStaff(profile.role)) return;
  const id = String(formData.get("incidentId"));
  const status = String(formData.get("status")) as IncidentStatus;
  if (!ALL_STATUSES.includes(status)) return;
  const supabase = await createClient();
  await supabase.from("incidents").update({ status }).eq("id", id);

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

  const kind = (String(formData.get("kind")) as TicketKind) || "incident";
  const doneStatus = doneStatusFor(kind);
  const supabase = await createClient();
  const { error } = await supabase
    .from("incidents")
    .update({
      resolution: parsed.data.resolution,
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
      `${parties?.title ?? ""}\n\n${parsed.data.resolution}`,
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
