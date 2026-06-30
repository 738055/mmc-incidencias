import Link from "next/link";
import type { Metadata } from "next";
import { KanbanSquare, List } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import {
  STATUS_LABELS,
  STATUS_TONE,
  IMPROVEMENT_STATUS_ORDER,
  canMoveCard,
} from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/incidents/badges";
import { KanbanMove } from "@/components/incidents/kanban-move";
import type { IncidentStatus } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Quadro de Melhorias" };

type Card = {
  id: string;
  ref: number;
  title: string;
  status: IncidentStatus;
  priority: "low" | "medium" | "high" | "critical";
  systems: { name: string } | null;
  companies: { name: string } | null;
};

export default async function ImprovementsBoardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // RLS escopa os resultados: equipe vê tudo; parceiro vê só as melhorias da
  // sua empresa; solicitante vê as que abriu.
  const { data } = await supabase
    .from("incidents")
    .select(
      "id, ref, title, status, priority, systems(name), companies(name)",
    )
    .eq("kind", "improvement")
    .order("created_at", { ascending: false })
    .limit(300);

  const cards = (data ?? []) as unknown as Card[];
  const movable = canMoveCard(profile.role);

  const byStatus = (s: IncidentStatus) => cards.filter((c) => c.status === s);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-navy-700">
            <KanbanSquare className="h-7 w-7" /> Quadro de Melhorias
          </h1>
          <p className="mt-1 text-base text-muted">
            Arraste o andamento pelo seletor de cada card.
            {movable ? "" : " (visualização)"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/melhorias">
            <List className="h-4 w-4" /> Ver em lista
          </Link>
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {IMPROVEMENT_STATUS_ORDER.map((status) => {
          const items = byStatus(status);
          return (
            <section
              key={status}
              className="flex w-72 shrink-0 flex-col rounded-xl bg-surface-muted/60 ring-1 ring-border"
            >
              <header className="flex items-center justify-between gap-2 px-4 py-3">
                <span
                  className={`font-label rounded-md px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset ${STATUS_TONE[status]}`}
                >
                  {STATUS_LABELS[status]}
                </span>
                <span className="font-label text-xs text-faint">
                  {items.length}
                </span>
              </header>

              <div className="flex flex-col gap-3 px-3 pb-3">
                {items.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-faint">
                    Nada aqui.
                  </p>
                ) : (
                  items.map((c) => (
                    <article
                      key={c.id}
                      className="rounded-lg border border-border bg-surface p-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-label text-[12px] font-bold text-navy-700">
                          #{c.ref}
                        </span>
                        <PriorityBadge priority={c.priority} />
                      </div>
                      <Link
                        href={`/melhorias/${c.id}`}
                        className="mt-2 block font-semibold leading-snug text-foreground hover:text-navy-700"
                      >
                        {c.title}
                      </Link>
                      <p className="mt-1 truncate text-xs text-muted">
                        {c.systems?.name ?? "Sem sistema"}
                        {c.companies?.name ? ` · ${c.companies.name}` : ""}
                      </p>
                      {movable && (
                        <KanbanMove incidentId={c.id} status={c.status} />
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
