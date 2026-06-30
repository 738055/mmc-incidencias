import { History } from "lucide-react";
import { STATUS_LABELS, STATUS_TONE } from "@/lib/domain";
import { formatDuration, formatDateTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { IncidentStatusHistory } from "@/lib/supabase/types";

/**
 * Tempo gasto em cada etapa do chamado (granularidade por estágio). Recebe o
 * histórico em ordem crescente; a duração de cada etapa é o intervalo até a
 * próxima (ou até agora, para a etapa atual).
 */
export function StageHistory({ items }: { items: IncidentStatusHistory[] }) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-5">
        <h2 className="mb-5 flex items-center gap-2 border-b border-border pb-3 text-xl font-bold text-navy-700">
          <History className="h-[18px] w-[18px] text-navy-700" />
          Histórico de etapas
        </h2>
        <ol className="space-y-3">
          {items.map((h, i) => {
            const next = items[i + 1];
            const current = i === items.length - 1;
            const duration = formatDuration(h.created_at, next?.created_at);
            return (
              <li key={h.id} className="flex items-center gap-3 text-sm">
                <span
                  className={`font-label shrink-0 rounded-md px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset ${STATUS_TONE[h.status]}`}
                >
                  {STATUS_LABELS[h.status]}
                </span>
                <span className="text-muted">{formatDateTime(h.created_at)}</span>
                <span className="ml-auto font-medium text-foreground">
                  {current ? `${duration} (atual)` : duration}
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
