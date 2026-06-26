import Link from "next/link";
import { MessageSquare, Paperclip } from "lucide-react";
import { StatusBadge, PriorityBadge } from "./badges";
import { timeAgo } from "@/lib/utils";
import type { Incident } from "@/lib/supabase/types";

export type IncidentRowData = Pick<
  Incident,
  "id" | "ref" | "title" | "status" | "priority" | "created_at"
> & {
  systems?: { name: string } | null;
  companies?: { name: string } | null;
  comment_count?: number;
  attachment_count?: number;
};

export function IncidentRow({
  incident,
  basePath = "/incidencias",
}: {
  incident: IncidentRowData;
  basePath?: string;
}) {
  return (
    <Link
      href={`${basePath}/${incident.id}`}
      className="flex items-center gap-4 border-b border-border px-6 py-[18px] transition-colors last:border-0 hover:bg-surface-muted/80"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-label text-[12px] font-bold text-navy-700">
            #{incident.ref}
          </span>
          <StatusBadge status={incident.status} />
        </div>
        <p className="mt-2 truncate font-semibold text-foreground">
          {incident.title}
        </p>
        <p className="mt-1 truncate text-xs text-muted">
          {incident.systems?.name ?? "Sem sistema"}
          {incident.companies?.name ? ` · ${incident.companies.name}` : ""} ·{" "}
          {timeAgo(incident.created_at)}
        </p>
      </div>

      <div className="hidden shrink-0 items-center gap-3 text-muted sm:flex">
        {!!incident.attachment_count && (
          <span className="flex items-center gap-1 text-xs">
            <Paperclip className="h-3.5 w-3.5" />
            {incident.attachment_count}
          </span>
        )}
        {!!incident.comment_count && (
          <span className="flex items-center gap-1 text-xs">
            <MessageSquare className="h-3.5 w-3.5" />
            {incident.comment_count}
          </span>
        )}
        <PriorityBadge priority={incident.priority} />
      </div>
    </Link>
  );
}
