import { History, Flag, UserCheck } from "lucide-react";
import { STATUS_LABELS, STATUS_TONE, PRIORITY_LABELS } from "@/lib/domain";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { IncidentStatus, IncidentPriority } from "@/lib/supabase/types";

export type LogEvent =
  | {
      id: string;
      at: string;
      kind: "status";
      status: IncidentStatus;
      actor: string | null;
      duration: string;
      current: boolean;
    }
  | {
      id: string;
      at: string;
      kind: "priority";
      from: IncidentPriority;
      to: IncidentPriority;
      reason: string | null;
      actor: string | null;
    }
  | { id: string; at: string; kind: "assign"; actor: string | null };

/**
 * Histórico unificado do chamado: mudanças de status (com autor e tempo em cada
 * etapa) + mudanças de prioridade (de→para, motivo, autor). Em ordem cronológica.
 * "Quem mexeu o quê" num lugar só. Comentários ficam em "Atividade" (à parte).
 */
export function TicketLog({ events }: { events: LogEvent[] }) {
  if (events.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-5">
        <h2 className="mb-5 flex items-center gap-2 border-b border-border pb-3 text-xl font-bold text-navy-700">
          <History className="h-[18px] w-[18px] text-navy-700" />
          Histórico do chamado
        </h2>
        <ol className="space-y-4">
          {events.map((e) => (
            <li key={`${e.kind}-${e.id}`} className="flex gap-3 text-sm">
              {e.kind === "status" && (
                <>
                  <span
                    className={`font-label mt-0.5 shrink-0 rounded-md px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset ${STATUS_TONE[e.status]}`}
                  >
                    {STATUS_LABELS[e.status]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground">
                      Entrou em <strong>{STATUS_LABELS[e.status]}</strong>
                      {e.actor ? ` · por ${e.actor}` : " · automático"}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDateTime(e.at)} ·{" "}
                      {e.current ? `${e.duration} (atual)` : e.duration}
                    </p>
                  </div>
                </>
              )}
              {e.kind === "priority" && (
                <>
                  <span className="mt-0.5 grid h-[26px] w-[26px] shrink-0 place-items-center rounded-md bg-orange-100 text-orange-700">
                    <Flag className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground">
                      Prioridade <strong>{PRIORITY_LABELS[e.from]}</strong> →{" "}
                      <strong>{PRIORITY_LABELS[e.to]}</strong>
                      {e.actor ? ` · por ${e.actor}` : ""}
                    </p>
                    {e.reason && <p className="text-muted">Motivo: {e.reason}</p>}
                    <p className="text-xs text-muted">{formatDateTime(e.at)}</p>
                  </div>
                </>
              )}
              {e.kind === "assign" && (
                <>
                  <span className="mt-0.5 grid h-[26px] w-[26px] shrink-0 place-items-center rounded-md bg-navy-100 text-navy-700">
                    <UserCheck className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground">
                      Chamado assumido{e.actor ? ` por ${e.actor}` : ""}
                    </p>
                    <p className="text-xs text-muted">{formatDateTime(e.at)}</p>
                  </div>
                </>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
