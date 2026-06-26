import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { AUDIT_ACTION_LABELS } from "@/lib/domain";
import { Card } from "@/components/ui/card";
import { RestrictedNotice } from "@/components/layout/restricted";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Auditoria" };

export default async function AuditPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") return <RestrictedNotice />;

  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const logs = (data as AuditLog[]) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-navy-700">
          <ScrollText className="h-6 w-6" /> Auditoria
        </h1>
        <p className="text-sm text-muted">
          Registro de ações sensíveis (acessos, aprovações, papéis, senhas).
        </p>
      </div>

      <Card>
        {logs.length > 0 ? (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                </p>
                <p className="truncate text-xs text-muted">
                  {log.actor_email ? `por ${log.actor_email}` : "sistema"}
                  {log.target_email ? ` · alvo: ${log.target_email}` : ""}
                  {log.details && typeof log.details.role === "string"
                    ? ` · papel: ${log.details.role}`
                    : ""}
                </p>
              </div>
              <span className="text-xs text-muted">
                {formatDateTime(log.created_at)}
              </span>
            </div>
          ))
        ) : (
          <p className="px-5 py-12 text-center text-sm text-muted">
            Nenhum registro de auditoria ainda.
          </p>
        )}
      </Card>
    </div>
  );
}
