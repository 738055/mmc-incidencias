import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/domain";
import type { IncidentStatus } from "@/lib/supabase/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IncidentRow } from "@/components/incidents/incident-row";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Incidências" };

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  await requireProfile();
  const supabase = await createClient();

  let query = supabase
    .from("incidents")
    .select(
      "id, ref, title, status, priority, created_at, systems(name), companies(name)",
    )
    .eq("kind", "incident")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status && STATUS_ORDER.includes(status as IncidentStatus)) {
    query = query.eq("status", status as IncidentStatus);
  }
  if (q && q.trim()) {
    query = query.textSearch("search", q.trim(), {
      type: "websearch",
      config: "portuguese",
    });
  }

  const { data: incidents } = await query;

  const filters = [
    { key: "", label: "Todos" },
    ...STATUS_ORDER.map((s) => ({ key: s, label: STATUS_LABELS[s] })),
  ];

  function filterHref(key: string) {
    const params = new URLSearchParams();
    if (key) params.set("status", key);
    if (q) params.set("q", q);
    const s = params.toString();
    return s ? `/incidencias?${s}` : "/incidencias";
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-700">Incidências</h1>
          <p className="text-sm text-muted">Todos os chamados que você pode ver.</p>
        </div>
        <Button asChild variant="accent">
          <Link href="/incidencias/nova">Novo chamado</Link>
        </Button>
      </div>

      {/* Busca */}
      <form className="relative" action="/incidencias">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por título, descrição ou solução..."
          className="h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-4 text-sm focus-visible:border-navy-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
        />
        {status && <input type="hidden" name="status" value={status} />}
      </form>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = (status ?? "") === f.key;
          return (
            <Link
              key={f.key || "all"}
              href={filterHref(f.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors",
                active
                  ? "bg-navy-700 text-white ring-navy-700"
                  : "bg-surface text-muted ring-border hover:bg-navy-50",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <Card>
        {incidents && incidents.length > 0 ? (
          incidents.map((inc) => (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <IncidentRow key={inc.id} incident={inc as any} />
          ))
        ) : (
          <p className="px-5 py-14 text-center text-sm text-muted">
            Nenhum chamado encontrado{q ? ` para “${q}”` : ""}.
          </p>
        )}
      </Card>
    </div>
  );
}
