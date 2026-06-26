import Link from "next/link";
import type { Metadata } from "next";
import { GraduationCap, Search, Film, ImageIcon, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { isStaff, CATEGORIES } from "@/lib/domain";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Tutoriais" };

export default async function TutorialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; system?: string; category?: string }>;
}) {
  const { q, system, category } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: systems } = await supabase
    .from("systems")
    .select("id, name")
    .eq("active", true)
    .order("name");

  let query = supabase
    .from("tutorials")
    .select("id, title, content, category, created_at, systems(name), tutorial_media(kind)")
    .order("created_at", { ascending: false })
    .limit(60);

  if (system) query = query.eq("system_id", system);
  if (category) query = query.eq("category", category);
  if (q && q.trim()) {
    query = query.textSearch("search", q.trim(), {
      type: "websearch",
      config: "portuguese",
    });
  }

  const { data: items } = await query;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-navy-700">
            <GraduationCap className="h-6 w-6" /> Tutoriais
          </h1>
          <p className="text-sm text-muted">
            Como resolver problemas frequentes — com passo a passo e vídeo.
          </p>
        </div>
        {isStaff(profile.role) && (
          <Button asChild variant="accent">
            <Link href="/tutoriais/novo">
              <Plus className="h-4 w-4" /> Novo tutorial
            </Link>
          </Button>
        )}
      </div>

      {/* Filtros */}
      <form
        action="/tutoriais"
        className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar tutorial..."
            className="h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-4 text-sm focus-visible:border-navy-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600"
          />
        </div>
        <select
          name="system"
          defaultValue={system ?? ""}
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm"
        >
          <option value="">Todos os sistemas</option>
          {systems?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          name="category"
          defaultValue={category ?? ""}
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm"
        >
          <option value="">Todas as categorias</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items && items.length > 0 ? (
          items.map((item) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const t = item as any;
            const media: { kind: string }[] = t.tutorial_media ?? [];
            const hasVideo = media.some((m) => m.kind === "video");
            const hasImage = media.some((m) => m.kind === "image");
            return (
              <Link key={t.id} href={`/tutoriais/${t.id}`}>
                <Card className="flex h-full flex-col p-5 transition-all hover:border-navy-300 hover:shadow-[var(--shadow-card-hover)]">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    {t.systems?.name && (
                      <span className="font-medium text-navy-700">
                        {t.systems.name}
                      </span>
                    )}
                    {t.category && <span>· {t.category}</span>}
                    <span className="ml-auto flex items-center gap-1.5 text-faint">
                      {hasVideo && <Film className="h-4 w-4" />}
                      {hasImage && <ImageIcon className="h-4 w-4" />}
                    </span>
                  </div>
                  <h3 className="mt-2 font-semibold text-navy-700">{t.title}</h3>
                  {t.content && (
                    <p className="mt-1.5 line-clamp-3 text-sm text-muted">
                      {t.content}
                    </p>
                  )}
                </Card>
              </Link>
            );
          })
        ) : (
          <Card className="p-10 text-center text-sm text-muted md:col-span-2 lg:col-span-3">
            Nenhum tutorial encontrado.
            {isStaff(profile.role) && (
              <>
                {" "}
                <Link href="/tutoriais/novo" className="text-orange-600 hover:underline">
                  Criar o primeiro
                </Link>
                .
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
