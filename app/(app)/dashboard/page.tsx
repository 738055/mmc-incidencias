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

  // Volume dos últimos 7 dias (só faz sentido p/ equipe, que enxerga tudo).
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
  const weekTotal = week.reduce((s, d) => s + d.count, 0);

  const metrics = [
    { label: "Abertos", value: open, icon: Ticket, accent: "bg-status-open", chip: "bg-status-open/10 text-status-open", href: "/incidencias?status=open" },
    { label: "Em andamento", value: inProgress, icon: Loader, accent: "bg-orange-500", chip: "bg-orange-500/10 text-orange-600", href: "/incidencias?status=in_progress" },
    { label: "Resolvidos", value: resolved, icon: CheckCircle2, accent: "bg-status-resolved", chip: "bg-status-resolved/10 text-status-resolved", href: "/incidencias?status=resolved" },
    { label: "Melhorias em aberto", value: improvements, icon: Rocket, accent: "bg-navy-700", chip: "bg-navy-700/10 text-navy-700", href: "/melhorias" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-navy-700">
            Olá, {profile.full_name?.split(" ")[0] || "bem-vindo"} 👋
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isStaff(profile.role)
              ? "Acompanhe e resolva as incidências do time."
              : "Acompanhe seus chamados e abra novas solicitações."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/melhorias/nova">Nova melhoria</Link>
          </Button>
          <Button asChild variant="accent">
            <Link href="/incidencias/nova">Novo chamado</Link>
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Link key={m.label} href={m.href} className="group">
            <Card className="relative overflow-hidden p-5 transition-all hover:border-navy-300 hover:shadow-[var(--shadow-card-hover)]">
              <span className={`absolute inset-y-0 left-0 w-1 ${m.accent}`} />
              <div className="flex items-start justify-between">
                <span className="font-label text-[11px] font-medium uppercase tracking-wider text-muted">
                  {m.label}
                </span>
                <span className={`grid h-8 w-8 place-items-center rounded-full ${m.chip}`}>
                  <m.icon className="h-[18px] w-[18px]" />
                </span>
              </div>
              <p className="mt-4 text-4xl font-bold tracking-tight text-navy-700">
                {m.value}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Volume da semana (equipe) */}
      {staff && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold text-navy-700">
              <BarChart3 className="h-5 w-5 text-orange-600" /> Volume da semana
            </h2>
            <span className="text-xs text-muted">
              {weekTotal} chamado{weekTotal === 1 ? "" : "s"} nos últimos 7 dias
            </span>
          </div>
          <div className="mt-6 grid grid-cols-7 gap-2 sm:gap-3">
            {week.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="flex h-32 w-full items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-navy-700 to-navy-400 transition-all"
                    style={{
                      height: `${Math.round((d.count / weekMax) * 100)}%`,
                      minHeight: d.count > 0 ? "10px" : "3px",
                    }}
                    title={`${d.count} chamado(s)`}
                  />
                </div>
                <span className="text-sm font-semibold text-navy-700">
                  {d.count}
                </span>
                <span className="font-label text-[10px] uppercase tracking-wider text-faint">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recentes */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-semibold text-navy-700">Chamados recentes</h2>
            <Link href="/incidencias" className="text-sm font-medium text-orange-600 hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="border-t border-border">
            {recent && recent.length > 0 ? (
              recent.map((inc) => (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <IncidentRow key={inc.id} incident={inc as any} />
              ))
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted">
                Nenhum chamado ainda. Que tal{" "}
                <Link href="/incidencias/nova" className="text-orange-600 hover:underline">
                  abrir o primeiro
                </Link>
                ?
              </p>
            )}
          </div>
        </Card>

        {/* Faixa IA */}
        <Card className="relative overflow-hidden border-navy-600 bg-navy-700 p-6 text-white shadow-md">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/20 blur-2xl" />
          <div className="relative">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-orange-500 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </span>
            <p className="mt-4 text-lg font-semibold">Suporte com IA</p>
            <p className="mt-1 text-sm text-navy-200">
              Ao abrir um chamado, a IA busca soluções de problemas parecidos já
              resolvidos e analisa as imagens anexadas.
            </p>
            <Link
              href="/base-conhecimento"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              Base de conhecimento <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
