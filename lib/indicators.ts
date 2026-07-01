import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { isDoneStatus, isOverdue } from "@/lib/domain";
import type {
  ManualMetric,
  IncidentPriority,
  IncidentStatus,
} from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export const INDICATOR_PERIODS = [
  { v: "30", label: "30 dias" },
  { v: "90", label: "90 dias" },
  { v: "365", label: "12 meses" },
  { v: "0", label: "Tudo" },
];

export function periodLabel(v: string): string {
  return INDICATOR_PERIODS.find((p) => p.v === v)?.label ?? "90 dias";
}

/** Duração legível a partir de milissegundos. */
export function formatMs(ms: number): string {
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return `${hours}h`;
  return "<1h";
}

/** Valor + unidade de uma métrica manual (R$ vira prefixo). */
export function fmtMetric(value: number, unit: string | null): string {
  const v = new Intl.NumberFormat("pt-BR").format(value);
  if (!unit) return v;
  if (unit === "R$" || unit === "$") return `${unit} ${v}`;
  return `${v} ${unit}`;
}

type Row = {
  kind: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  created_at: string;
  resolved_at: string | null;
  department_id: string | null;
  improvement_type: string | null;
};

export type Indicators = {
  periodo: string;
  kpis: {
    demandas: number;
    bugs: number;
    melhoriasImplementadas: number;
    automacoes: number;
    tempoMedio: string;
    concluidasComTempo: number;
    criticasAbertas: number;
    atrasadas: number;
    sistemasAtivos: number;
    projetosAndamento: number;
    projetosConcluidos: number;
  };
  ranking: { label: string; total: number; bugs: number; melhorias: number }[];
  manualMetrics: ManualMetric[];
};

/** Calcula todos os indicadores do período. Fonte única (tela + exportação). */
export async function getIndicators(
  supabase: Client,
  periodoRaw?: string,
): Promise<Indicators> {
  const periodo = INDICATOR_PERIODS.some((p) => p.v === periodoRaw)
    ? periodoRaw!
    : "90";
  const days = Number(periodo);
  const since =
    days > 0 ? new Date(Date.now() - days * 86_400_000).toISOString() : null;

  let query = supabase
    .from("incidents")
    .select(
      "kind, status, priority, created_at, resolved_at, department_id, improvement_type",
    );
  if (since) query = query.gte("created_at", since);

  const [{ data: rows }, { count: activeSystems }, { data: deptRows }, { data: manualMetrics }] =
    await Promise.all([
      query,
      supabase
        .from("systems")
        .select("*", { count: "exact", head: true })
        .eq("active", true),
      supabase.from("departments").select("id, name").order("name"),
      supabase.from("manual_metrics").select("*").order("sort").order("label"),
    ]);

  const incidents = (rows as Row[]) ?? [];
  const deptName = new Map((deptRows ?? []).map((d) => [d.id, d.name]));
  const type = (i: Row) => i.improvement_type ?? "improvement";
  const improvements = incidents.filter((i) => i.kind === "improvement");

  const doneWithTime = incidents.filter((i) => i.resolved_at);
  const avgMs = doneWithTime.length
    ? doneWithTime.reduce(
        (s, i) =>
          s +
          (new Date(i.resolved_at!).getTime() -
            new Date(i.created_at).getTime()),
        0,
      ) / doneWithTime.length
    : 0;

  const byDept = new Map<
    string,
    { label: string; total: number; bugs: number; melhorias: number }
  >();
  for (const i of incidents) {
    const key = i.department_id ?? "none";
    const label = i.department_id
      ? deptName.get(i.department_id) ?? "—"
      : "Sem departamento";
    const e = byDept.get(key) ?? { label, total: 0, bugs: 0, melhorias: 0 };
    e.total++;
    if (i.kind === "incident") e.bugs++;
    else e.melhorias++;
    byDept.set(key, e);
  }

  return {
    periodo,
    kpis: {
      demandas: incidents.length,
      bugs: incidents.filter((i) => i.kind === "incident").length,
      melhoriasImplementadas: improvements.filter(
        (i) => i.status === "delivered" && type(i) === "improvement",
      ).length,
      automacoes: improvements.filter(
        (i) => i.status === "delivered" && type(i) === "automation",
      ).length,
      tempoMedio: doneWithTime.length ? formatMs(avgMs) : "—",
      concluidasComTempo: doneWithTime.length,
      criticasAbertas: incidents.filter(
        (i) => i.priority === "critical" && !isDoneStatus(i.status),
      ).length,
      atrasadas: incidents.filter((i) =>
        isOverdue(i.status, i.priority, i.created_at),
      ).length,
      sistemasAtivos: activeSystems ?? 0,
      projetosAndamento: improvements.filter(
        (i) => type(i) === "project" && !isDoneStatus(i.status),
      ).length,
      projetosConcluidos: improvements.filter(
        (i) => type(i) === "project" && i.status === "delivered",
      ).length,
    },
    ranking: [...byDept.values()].sort((a, b) => b.total - a.total),
    manualMetrics: manualMetrics ?? [],
  };
}
