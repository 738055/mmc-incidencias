import Link from "next/link";
import type { Metadata } from "next";
import { Search, BookOpen, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Base de conhecimento" };

export default async function KnowledgeBasePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  await requireProfile();
  const supabase = await createClient();

  let query = supabase
    .from("incidents")
    .select("id, ref, title, resolution, resolved_at, systems(name)")
    .in("status", ["resolved", "closed"])
    .not("resolution", "is", null)
    .order("resolved_at", { ascending: false })
    .limit(50);

  if (q && q.trim()) {
    query = query.textSearch("search", q.trim(), {
      type: "websearch",
      config: "portuguese",
    });
  }

  const { data: items } = await query;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-navy-700">
          <BookOpen className="h-6 w-6" /> Base de conhecimento
        </h1>
        <p className="text-sm text-muted">
          Soluções de problemas já resolvidos. Pesquise antes de abrir um novo
          chamado.
        </p>
      </div>

      <form className="relative" action="/base-conhecimento">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar uma solução..."
          className="h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-4 text-sm focus-visible:border-navy-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
        />
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {items && items.length > 0 ? (
          items.map((item) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const it = item as any;
            return (
              <Link key={it.id} href={`/incidencias/${it.id}`}>
                <Card className="h-full p-5 transition-shadow hover:shadow-lg">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="font-semibold">#{it.ref}</span>
                    {it.systems?.name && <span>· {it.systems.name}</span>}
                    <span className="ml-auto flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Resolvido
                    </span>
                  </div>
                  <h3 className="mt-2 font-semibold text-navy-700">{it.title}</h3>
                  <p className="mt-1.5 line-clamp-3 text-sm text-muted">
                    {it.resolution}
                  </p>
                  <p className="mt-3 text-xs text-muted">
                    {formatDateTime(it.resolved_at)}
                  </p>
                </Card>
              </Link>
            );
          })
        ) : (
          <Card className="md:col-span-2 p-10 text-center text-sm text-muted">
            Nenhuma solução encontrada{q ? ` para “${q}”` : " ainda"}.
          </Card>
        )}
      </div>
    </div>
  );
}
