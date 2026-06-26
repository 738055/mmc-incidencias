import { createAdminClient } from "@/lib/supabase/server";

export interface AuditEntry {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetId?: string | null;
  targetEmail?: string | null;
  details?: Record<string, unknown>;
}

/**
 * Registra uma ação sensível na trilha de auditoria. Best-effort: nunca lança
 * (usa o service role; se não configurado, apenas loga o aviso).
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      actor_id: entry.actorId ?? null,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      target_id: entry.targetId ?? null,
      target_email: entry.targetEmail ?? null,
      details: entry.details ?? {},
    });
  } catch (err) {
    console.error("[audit] falha ao registrar:", err);
  }
}
