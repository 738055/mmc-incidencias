import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { sendIncidentEmail } from "@/lib/email/send";
import { KIND_LABELS, PRIORITY_LABELS } from "@/lib/domain";
import { formatDateTime } from "@/lib/utils";
import { sanitizeRichText } from "@/lib/sanitize";
import type { TicketKind, IncidentPriority } from "@/lib/supabase/types";

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 dias

/**
 * Roteia um chamado ACEITO ao desenvolvedor do sistema (e contatos da empresa).
 * Usado na triagem do admin — só depois do aceite o dev é acionado. Carrega os
 * dados via service role e reaproveita o template `IncidentNotificationEmail`.
 * Tolerante a falhas; devolve quantos destinatários receberam.
 */
export async function notifyDeveloper(
  incidentId: string,
  note?: string,
): Promise<{ sent: boolean; recipients: number }> {
  try {
    const admin = createAdminClient();

    const { data: inc } = await admin
      .from("incidents")
      .select(
        "ref, kind, title, description, priority, system_id, company_id, created_by, category, stakeholder_area, benefit, ai_analysis, created_at",
      )
      .eq("id", incidentId)
      .single();
    if (!inc) return { sent: false, recipients: 0 };

    const { data: system } = inc.system_id
      ? await admin
          .from("systems")
          .select("name, developer_emails")
          .eq("id", inc.system_id)
          .single()
      : { data: null };
    const { data: company } = inc.company_id
      ? await admin
          .from("companies")
          .select("name, contact_emails")
          .eq("id", inc.company_id)
          .single()
      : { data: null };

    const recipients = [
      ...(system?.developer_emails ?? []),
      ...(company?.contact_emails ?? []),
    ]
      .map((e) => e.trim().toLowerCase())
      .filter((e, i, arr) => e && arr.indexOf(e) === i);

    if (recipients.length === 0) return { sent: false, recipients: 0 };

    // Nome de quem abriu (para o e-mail).
    const { data: creator } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", inc.created_by)
      .single();

    // URLs assinadas de TODOS os anexos: imagens vão embutidas; demais (PDF,
    // docs, etc.) viram links de download — o dev não acessa a plataforma.
    const { data: atts } = await admin
      .from("incident_attachments")
      .select("storage_path, mime_type, file_name, size_bytes")
      .eq("incident_id", incidentId);
    const imageUrls: string[] = [];
    const fileLinks: { name: string; url: string; size: string }[] = [];
    for (const a of atts ?? []) {
      const { data } = await admin.storage
        .from("attachments")
        .createSignedUrl(a.storage_path, SIGNED_URL_TTL);
      if (!data?.signedUrl) continue;
      if (a.mime_type.startsWith("image/")) imageUrls.push(data.signedUrl);
      else
        fileLinks.push({
          name: a.file_name,
          url: data.signedUrl,
          size: humanSize(a.size_bytes),
        });
    }

    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const basePath = inc.kind === "improvement" ? "/melhorias" : "/incidencias";

    const res = await sendIncidentEmail(recipients, {
      ref: inc.ref,
      kindLabel: KIND_LABELS[inc.kind as TicketKind],
      title: inc.title,
      description: sanitizeRichText(inc.description),
      systemName: system?.name ?? null,
      category: inc.category,
      stakeholderArea: inc.stakeholder_area,
      benefit: inc.benefit ? sanitizeRichText(inc.benefit) : inc.benefit,
      priorityLabel: PRIORITY_LABELS[inc.priority as IncidentPriority],
      requesterName: creator?.full_name || creator?.email || "Solicitante",
      companyName: company?.name ?? "MMC Incidências",
      openedAt: formatDateTime(inc.created_at),
      aiAnalysis: inc.ai_analysis,
      triageNote: note ?? null,
      url: `${base}${basePath}/${incidentId}`,
      imageUrls,
      fileLinks,
    });
    return { sent: res.ok, recipients: recipients.length };
  } catch (err) {
    console.error("[notifyDeveloper]:", err);
    return { sent: false, recipients: 0 };
  }
}
