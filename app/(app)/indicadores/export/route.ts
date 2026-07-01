import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { isStaff } from "@/lib/domain";
import { getIndicators, periodLabel } from "@/lib/indicators";

/** Uma célula CSV — escapa aspas/;/quebras (separador ";" p/ Excel pt-BR). */
function cell(v: string | number): string {
  const s = String(v ?? "");
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Número no formato pt-BR (vírgula decimal) para o Excel ler como número. */
function num(n: number): string {
  return String(n).replace(".", ",");
}

/**
 * Exporta os indicadores como CSV (Excel abre nativo). BOM UTF-8 + separador
 * ";" para o Excel em pt-BR não quebrar acentos nem juntar colunas.
 */
export async function GET(req: Request) {
  const profile = await requireProfile();
  if (!isStaff(profile.role)) {
    return new Response("Acesso restrito.", { status: 403 });
  }

  const periodo = new URL(req.url).searchParams.get("periodo") ?? "90";
  const supabase = await createClient();
  const ind = await getIndicators(supabase, periodo);
  const k = ind.kpis;

  const rows: (string | number)[][] = [
    ["Indicadores de Inovacao & Tecnologia"],
    ["Periodo", periodLabel(ind.periodo)],
    ["Gerado em", new Date().toLocaleString("pt-BR")],
    [],
    ["Indicador", "Valor"],
    ["Demandas recebidas", k.demandas],
    ["Bugs registrados", k.bugs],
    ["Melhorias implementadas", k.melhoriasImplementadas],
    ["Automacoes criadas", k.automacoes],
    ["Tempo medio de resolucao", k.tempoMedio],
    ["Demandas criticas abertas", k.criticasAbertas],
    ["Demandas atrasadas (SLA)", k.atrasadas],
    ["Sistemas ativos", k.sistemasAtivos],
    ["Projetos em andamento", k.projetosAndamento],
    ["Projetos concluidos", k.projetosConcluidos],
    [],
    ["Demandas por departamento"],
    ["Departamento", "Total", "Bugs", "Melhorias"],
    ...ind.ranking.map((r) => [r.label, r.total, r.bugs, r.melhorias]),
    [],
    ["Metricas complementares (manuais)"],
    ["Indicador", "Valor", "Unidade", "Periodo", "Observacao"],
    ...ind.manualMetrics.map((m) => [
      m.label,
      num(m.value),
      m.unit ?? "",
      m.period ?? "",
      m.note ?? "",
    ]),
  ];

  const BOM = "﻿"; // Excel pt-BR precisa do BOM p/ acentos
  const csv = BOM + rows.map((r) => r.map(cell).join(";")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="indicadores-${ind.periodo}.csv"`,
    },
  });
}
