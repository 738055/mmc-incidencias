import type { Metadata } from "next";
import Link from "next/link";
import {
  Inbox,
  Bug,
  Rocket,
  Zap,
  Timer,
  AlertTriangle,
  CalendarClock,
  Server,
  FolderKanban,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { isStaff } from "@/lib/domain";
import { getIndicators, fmtMetric, INDICATOR_PERIODS } from "@/lib/indicators";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { RestrictedNotice } from "@/components/layout/restricted";
import { IndicatorsExport } from "@/components/incidents/indicators-export";

export const metadata: Metadata = { title: "Indicadores" };

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone = "navy",
}: {
  icon: typeof Inbox;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "navy" | "orange" | "red" | "green";
}) {
  const tones = {
    navy: "text-navy-700 bg-navy-100",
    orange: "text-orange-700 bg-orange-100",
    red: "text-status-critical bg-red-50",
    green: "text-status-resolved bg-green-50",
  };
  return (
    <Card>
      <CardContent className="flex items-start gap-3 pt-5">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-navy-700">{value}</p>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function IndicadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const profile = await requireProfile();
  if (!isStaff(profile.role)) return <RestrictedNotice />;

  const sp = await searchParams;
  const supabase = await createClient();
  const ind = await getIndicators(supabase, sp.periodo);
  const k = ind.kpis;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-navy-700">
            Indicadores de Inovação &amp; Tecnologia
          </h1>
          <p className="mt-1 text-base text-muted">
            Métricas reais da plataforma no período selecionado (por data de
            abertura).
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
            {INDICATOR_PERIODS.map((p) => (
              <Link
                key={p.v}
                href={`/indicadores?periodo=${p.v}`}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  p.v === ind.periodo
                    ? "bg-navy-700 text-white"
                    : "text-muted hover:text-navy-700",
                )}
              >
                {p.label}
              </Link>
            ))}
          </div>
          <IndicatorsExport periodo={ind.periodo} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Inbox} label="Demandas recebidas" value={k.demandas} />
        <Kpi icon={Bug} label="Bugs registrados" value={k.bugs} tone="red" />
        <Kpi icon={Rocket} label="Melhorias implementadas" value={k.melhoriasImplementadas} tone="green" />
        <Kpi icon={Zap} label="Automações criadas" value={k.automacoes} tone="orange" />
        <Kpi icon={Timer} label="Tempo médio de resolução" value={k.tempoMedio} hint={`${k.concluidasComTempo} concluídas`} />
        <Kpi icon={AlertTriangle} label="Demandas críticas abertas" value={k.criticasAbertas} tone="red" />
        <Kpi icon={CalendarClock} label="Demandas atrasadas" value={k.atrasadas} hint="Fora do SLA da prioridade" tone="orange" />
        <Kpi icon={Server} label="Sistemas ativos" value={k.sistemasAtivos} />
        <Kpi icon={FolderKanban} label="Projetos em andamento" value={k.projetosAndamento} />
        <Kpi icon={CheckCircle2} label="Projetos concluídos" value={k.projetosConcluidos} tone="green" />
      </div>

      <Card className="overflow-hidden">
        <CardContent className="pt-5">
          <h2 className="mb-4 text-xl font-bold text-navy-700">
            Demandas por departamento
          </h2>
          {ind.ranking.length === 0 ? (
            <p className="text-sm text-muted">Sem dados no período.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="pb-2 font-medium">Departamento</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                  <th className="pb-2 text-right font-medium">Bugs</th>
                  <th className="pb-2 text-right font-medium">Melhorias</th>
                </tr>
              </thead>
              <tbody>
                {ind.ranking.map((r) => (
                  <tr key={r.label} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-medium text-foreground">{r.label}</td>
                    <td className="py-2.5 text-right font-semibold text-navy-700">{r.total}</td>
                    <td className="py-2.5 text-right text-muted">{r.bugs}</td>
                    <td className="py-2.5 text-right text-muted">{r.melhorias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="no-print mt-4 text-xs text-muted">
            Vincule usuários a departamentos (Admin → Usuários) para popular este
            ranking. Chamados antigos, sem departamento, aparecem em “Sem
            departamento”.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-navy-700">
              Métricas complementares
            </h2>
            {profile.role === "admin" && (
              <Link href="/metricas" className="no-print text-sm font-medium text-orange-700 hover:underline">
                Gerenciar →
              </Link>
            )}
          </div>
          {ind.manualMetrics.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ind.manualMetrics.map((m) => (
                <div key={m.id} className="rounded-lg border border-border p-4">
                  <p className="text-2xl font-bold text-navy-700">{fmtMetric(m.value, m.unit)}</p>
                  <p className="text-sm font-medium text-foreground">{m.label}</p>
                  {(m.period || m.note) && (
                    <p className="mt-0.5 text-xs text-muted">
                      {[m.period, m.note].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nenhuma métrica manual cadastrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
