import Link from "next/link";
import type { Metadata } from "next";
import { Search, Rocket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { STATUS_LABELS, IMPROVEMENT_STATUS_ORDER } from "@/lib/domain";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IncidentRow } from "@/components/incidents/incident-row";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import type { IncidentStatus } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Melhorias & Desenvolvimento" };

const PAGE_SIZE = 20;

export default async function ImprovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { status, q, page: pageParam } = await searchParams;
  await requireProfile();
  const supabase = await createClient();

  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("incidents")
    .select(
      "id, ref, title, status, priority, created_at, systems(name), companies(name)",
      { count: "exact" },
    )
    .eq("kind", "improvement")
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (status && IMPROVEMENT_STATUS_ORDER.includes(status as IncidentStatus)) {
    query = query.eq("status", status as IncidentStatus);
  }
  if (q && q.trim()) {
    query = query.textSearch("search", q.trim(), {
      type: "websearch",
      config: "portuguese",
    });
  }

  const { data: items, count } = await query;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const filters = [
    { key: "", label: "Todas" },
    ...IMPROVEMENT_STATUS_ORDER.map((s) => ({ key: s, label: STATUS_LABELS[s] })),
  ];

  function filterHref(key: string) {
    const params = new URLSearchParams();
    if (key) params.set("status", key);
    if (q) params.set("q", q);
    const s = params.toString();
    return s ? `/melhorias?${s}` : "/melhorias";
  }

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/melhorias?${s}` : "/melhorias";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-navy-700">
            <Rocket className="h-7 w-7" /> Melhorias & Desenvolvimento
          </h1>
          <p className="mt-1 text-base text-muted">
            Pedidos para evoluir e aprimorar os sistemas dos stakeholders.
          </p>
        </div>
        <Button asChild variant="accent">
          <Link href="/melhorias/nova">Nova melhoria</Link>
        </Button>
      </div>

      <form className="relative max-w-2xl" action="/melhorias">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" />
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por título, descrição ou entrega..."
          className="h-12 w-full rounded-lg border border-border bg-surface-muted pl-12 pr-4 text-sm shadow-sm focus-visible:border-navy-400 focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
        />
        {status && <input type="hidden" name="status" value={status} />}
      </form>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = (status ?? "") === f.key;
          return (
            <Link
              key={f.key || "all"}
              href={filterHref(f.key)}
              className={cn(
                "font-label rounded-lg px-4 py-2 text-[12px] font-medium ring-1 ring-inset transition-colors",
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

      <Card className="overflow-hidden">
        {items && items.length > 0 ? (
          items.map((inc) => (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <IncidentRow key={inc.id} incident={inc as any} basePath="/melhorias" />
          ))
        ) : (
          <p className="px-6 py-14 text-center text-sm text-muted">
            Nenhuma melhoria encontrada{q ? ` para "${q}"` : ""}.
          </p>
        )}
      </Card>

      <Pagination page={page} totalPages={totalPages} hrefForPage={pageHref} />
    </div>
  );
}
