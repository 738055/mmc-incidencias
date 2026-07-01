import type { Metadata } from "next";
import { LineChart, PlusCircle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AdminTabs } from "@/components/admin/admin-tabs";
import {
  createManualMetricAction,
  updateManualMetricAction,
  deleteManualMetricAction,
} from "@/app/(app)/admin/actions";
import { RestrictedNotice } from "@/components/layout/restricted";

export const metadata: Metadata = { title: "Métricas manuais" };

const SUGGESTIONS = [
  "Integrações funcionando",
  "Dashboards ativos",
  "Aderência das equipes (%)",
  "Redução de retrabalho (%)",
  "Horas economizadas/mês",
  "Impacto em vendas",
  "Impacto em operações",
  "Impacto em atendimento",
];

export default async function ManualMetricsPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") return <RestrictedNotice />;

  const supabase = await createClient();
  const { data: metrics } = await supabase
    .from("manual_metrics")
    .select("*")
    .order("sort")
    .order("label");

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-navy-700">
          Administração
        </h1>
        <p className="mt-1 text-base text-muted">
          Gerencie sistemas, empresas, departamentos, usuários e métricas.
        </p>
      </div>

      <AdminTabs />

      <div>
        <div className="flex items-center gap-3 text-navy-700">
          <LineChart className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Métricas manuais</h2>
          <span className="font-label text-xs text-muted">
            ({metrics?.length ?? 0})
          </span>
        </div>
        <p className="mt-2 text-sm text-muted">
          Indicadores que não vêm dos chamados (integrações, dashboards, aderência,
          retrabalho, horas economizadas, impactos). Você lança/atualiza aqui e eles
          aparecem no painel de <strong>Indicadores</strong>.
        </p>
      </div>

      <details className="group overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
        <summary className="flex cursor-pointer items-center gap-2 px-6 py-4 text-sm font-semibold text-navy-700 marker:content-['']">
          <PlusCircle className="h-4 w-4 text-orange-700" /> Adicionar métrica
        </summary>
        <CardContent className="border-t border-border pt-5">
          <form
            action={createManualMetricAction}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <Label htmlFor="label">Nome do indicador</Label>
              <Input
                id="label"
                name="label"
                required
                list="metric-suggestions"
                placeholder="Ex.: Integrações funcionando"
              />
              <datalist id="metric-suggestions">
                {SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <Label htmlFor="value">Valor</Label>
              <Input id="value" name="value" type="number" step="any" required defaultValue={0} />
            </div>
            <div>
              <Label htmlFor="unit">Unidade</Label>
              <Input id="unit" name="unit" placeholder="%, h, un, R$…" />
            </div>
            <div>
              <Label htmlFor="period">Período (opcional)</Label>
              <Input id="period" name="period" placeholder="Ex.: Junho/2026" />
            </div>
            <div>
              <Label htmlFor="note">Observação (opcional)</Label>
              <Input id="note" name="note" placeholder="Fonte, contexto…" />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" variant="accent">
                Adicionar
              </Button>
            </div>
          </form>
        </CardContent>
      </details>

      <div className="space-y-3">
        {metrics && metrics.length > 0 ? (
          metrics.map((m) => (
            <Card key={m.id}>
              <CardContent className="pt-5">
                <form
                  action={updateManualMetricAction}
                  className="grid items-end gap-3 sm:grid-cols-12"
                >
                  <input type="hidden" name="id" value={m.id} />
                  <div className="sm:col-span-4">
                    <Label>Indicador</Label>
                    <Input name="label" defaultValue={m.label} required />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Valor</Label>
                    <Input name="value" type="number" step="any" defaultValue={m.value} required />
                  </div>
                  <div className="sm:col-span-1">
                    <Label>Un.</Label>
                    <Input name="unit" defaultValue={m.unit ?? ""} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Período</Label>
                    <Input name="period" defaultValue={m.period ?? ""} />
                  </div>
                  <div className="sm:col-span-3">
                    <Label>Observação</Label>
                    <Input name="note" defaultValue={m.note ?? ""} />
                  </div>
                  <div className="flex gap-2 sm:col-span-12">
                    <Button type="submit" variant="outline" size="sm">
                      Salvar
                    </Button>
                  </div>
                </form>
                <form action={deleteManualMetricAction} className="mt-2">
                  <input type="hidden" name="id" value={m.id} />
                  <Button type="submit" variant="ghost" size="sm" className="text-red-600">
                    <Trash2 className="h-4 w-4" /> Excluir
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted">Nenhuma métrica manual cadastrada.</p>
        )}
      </div>
    </div>
  );
}
