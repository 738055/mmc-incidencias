import Link from "next/link";
import type { Metadata } from "next";
import {
  Ticket,
  Loader,
  CheckCircle2,
  Rocket,
  Sparkles,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { isStaff } from "@/lib/domain";
import type { IncidentStatus } from "@/lib/supabase/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IncidentRow } from "@/components/incidents/incident-row";

export const metadata: Metadata = { title: "Painel" };

async function countByStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  status: IncidentStatus,
) {
  const { count } = await supabase
    .from("incidents")
    .select("*", { count: "exact", head: true })
    .eq("kind", "incident")
    .eq("status", status);
  return count ?? 0;
}

async function countOpenImprovements(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { count } = await supabase
    .from("incidents")
    .select("*", { count: "exact", head: true })
    .eq("kind", "improvement")
    .in("status", ["requested", "in_analysis", "approved", "in_development"]);
  return count ?? 0;
}

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [open, inProgress, resolved, improvements] = await Promise.all([
    countByStatus(supabase, "open"),
    countByStatus(supabase, "in_progress"),
    countByStatus(supabase, "resolved"),
    countOpenImprovements(supabase),
  ]);

  const { data: recent } = await supabase
    .from("incidents")
    .select("id, ref, title, status, priority, created_at, systems(name), companies(name)")
    .eq("kind", "incident")
    .order("created_at", { ascending: false })
    .limit(6);

  const staff = isStaff(profile.role);
  let week: { label: string; count: number }[] = [];
  if (staff) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    const { data: rows } = await supabase
      .from("incidents")
      .select("created_at")
      .gte("created_at", start.toISOString());

    week = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const next = new Date(day);
      next.setDate(day.getDate() + 1);
      const count = (rows ?? []).filter((r) => {
        const t = new Date(r.created_at as string);
        return t >= day && t < next;
      }).length;
      const label = day
        .toLocaleDateString("pt-BR", { weekday: "short" })
        .replace(".", "");
      return { label, count };
    });
  }

  const weekMax = Math.max(1, ...week.map((d) => d.count));
  const weekTotal = week.reduce((sum, d) => sum + d.count, 0);
  const chartPoints = week
    .map((d, i) => {
      const x = week.length <= 1 ? 50 : (i / (week.length - 1)) * 100;
      const y = 88 - (d.count / weekMax) * 66;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const chartArea = chartPoints ? `0,96 ${chartPoints} 100,96` : "";

  const metrics = [
    {
      label: "Abertos",
      value: open,
      icon: Ticket,
      accent: "border-l-status-open",
      chip: "bg-status-open/10 text-status-open",
      note: "aguardando triagem",
      href: "/incidencias?status=open",
    },
    {
      label: "Em andamento",
      value: inProgress,
      icon: Loader,
      accent: "border-l-orange-500",
      chip: "bg-orange-500/10 text-orange-700",
      note: "em tratativa",
      href: "/incidencias?status=in_progress",
    },
    {
      label: "Resolvidos",
      value: resolved,
      icon: CheckCircle2,
      accent: "border-l-status-resolved",
      chip: "bg-status-resolved/10 text-status-resolved",
      note: "base para reaproveitar",
      href: "/incidencias?status=resolved",
    },
    {
      label: "Melhorias",
      value: improvements,
      icon: Rocket,
      accent: "border-l-navy-700",
      chip: "bg-navy-700/10 text-navy-700",
      note: "pipeline aberto",
      href: "/melhorias",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-navy-700 md:text-4xl">
            Olá, {profile.full_name?.split(" ")[0] || "bem-vindo"}
          </h1>
          <p className="mt-2 text-base text-muted">
            {staff
              ? "Aqui está o status atual do ambiente de TI."
              : "Acompanhe seus chamados e abra novas solicitações."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/melhorias/nova">Nova melhoria</Link>
          </Button>
          <Button asChild variant="accent">
            <Link href="/incidencias/nova">Novo chamado</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <Link key={m.label} href={m.href} className="group">
            <Card
              className={`h-full border-l-4 ${m.accent} p-6 transition-all hover:border-navy-300 hover:shadow-[var(--shadow-card-hover)]`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="font-label text-[12px] font-medium uppercase text-muted">
                  {m.label}
                </span>
                <span className={`grid h-10 w-10 place-items-center rounded-full ${m.chip}`}>
                  <m.icon className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-7 flex items-end gap-2">
                <p className="text-4xl font-bold tracking-tight text-navy-700">
                  {m.value}
                </p>
                <p className="pb-1 text-sm text-muted">{m.note}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          {staff && (
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-navy-700">
                  <BarChart3 className="h-6 w-6 text-orange-700" />
                  Volume da semana
                </h2>
                <div className="font-label flex items-center gap-3 text-[12px]">
                  <span className="rounded-lg border border-border bg-surface-muted px-4 py-2 text-navy-700">
                    Esta semana
                  </span>
                  <span className="text-muted">{weekTotal} chamados</span>
                </div>
              </div>

              <div className="p-6">
                <div className="relative h-[340px] overflow-hidden rounded-lg bg-surface">
                  <div className="absolute inset-0 grid grid-rows-5 border-l border-border/70">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="border-b border-border/55" />
                    ))}
                  </div>
                  <div className="absolute inset-0 grid grid-cols-7">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <span key={i} className="border-r border-border/45 last:border-r-0" />
                    ))}
                  </div>
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-full w-full"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="week-area" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#001736" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#001736" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points={chartArea} fill="url(#week-area)" />
                    <polyline
                      points={chartPoints}
                      fill="none"
                      stroke="#001736"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.2"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
                <div className="font-label mt-4 grid grid-cols-7 gap-2 text-center text-[12px] text-muted">
                  {week.map((d) => (
                    <div key={d.label}>
                      <p className="font-semibold text-navy-700">{d.count}</p>
                      <p className="uppercase">{d.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h2 className="text-xl font-bold text-navy-700">Chamados recentes</h2>
              <Link
                href="/incidencias"
                className="font-label text-[12px] font-medium text-orange-700 hover:underline"
              >
                Ver todos
              </Link>
            </div>
            <div>
              {recent && recent.length > 0 ? (
                recent.map((inc) => (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  <IncidentRow key={inc.id} incident={inc as any} />
                ))
              ) : (
                <p className="px-6 py-12 text-center text-sm text-muted">
                  Nenhum chamado ainda.
                </p>
              )}
            </div>
          </Card>
        </div>

        <Card className="bg-navy-700 p-6 text-white shadow-[0_18px_40px_rgba(0,23,54,0.22)]">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-white/10 text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <p className="mt-5 text-2xl font-bold">Assistente IA</p>
          <p className="mt-3 text-sm leading-relaxed text-navy-100">
            Consulte tutoriais, soluções e chamados resolvidos em linguagem natural.
          </p>
          <Link
            href="/assistente"
            className="mt-6 inline-flex h-11 w-full items-center justify-between rounded-lg border border-white/20 bg-navy-600/60 px-4 text-sm font-medium text-navy-100 transition-colors hover:bg-navy-600"
          >
            Abrir assistente <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
    </div>
  );
}
