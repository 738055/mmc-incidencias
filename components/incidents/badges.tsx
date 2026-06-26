import { Badge } from "@/components/ui/badge";
import {
  PRIORITY_LABELS,
  PRIORITY_TONE,
  STATUS_LABELS,
  STATUS_TONE,
} from "@/lib/domain";
import type { IncidentPriority, IncidentStatus } from "@/lib/supabase/types";

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <Badge className={STATUS_TONE[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: IncidentPriority }) {
  return (
    <Badge className={PRIORITY_TONE[priority]}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
