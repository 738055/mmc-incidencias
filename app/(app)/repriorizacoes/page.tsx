import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, TrendingUp, PauseCircle, Hourglass } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  PRIORITY_CHANGE_ACTION,
  STATUS_PAUSE_ACTION,
} from "@/lib/domain";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/incidents/badges";
import { RestrictedNotice } from "@/components/layout/restricted";
import { formatDateTime, formatDuration } from "@/lib/utils";
import type {
  IncidentPriority,
  IncidentStatus,
} from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Repriorizações" };

const OPEN_IMPROVEMENT: IncidentStatus[] = [
  "requested",
  "in_analysis",
  "approved",
  "in_development",
];

type Event = {
  id: string;
  action: string;
  actor_email: string | null;
  target_id: string | null;
  created_at: string;
  details: {
    ref?: number;
    title?: string;
    from?: string;
    to?: string;
    reason?: string;
  };
};

export default async function RepriorizacoesPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") return <RestrictedNotice />;

  const supabase = await createClient();

  const [{ data: events }, { data: stuck }] = await Promise.all([
    supabase
      .from("audit_log")
      .select("id, action, actor_email, target_id, created_at, details")
      .in("action", [PRIORITY_CHANGE_ACTION, STATUS_PAUSE_ACTION])
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("incidents")
      .select("id, ref, title, status, priority, updated_at, systems(name)")
      .eq("kind", "improvement")
      .in("status", OPEN_IMPROVEMENT)
      .limit(50),
  ]);

  const timeline = (events ?? []) as unknown as Event[];

  // Tempo EXATO na etapa atual: o registro de histórico mais recente de cada
  // chamado é a entrada no status corrente. Sem isso (legado), cai no updated_at.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stuckRows = (stuck ?? []) as any[];
  const enteredAt = new Map<string, string>();
  if (stuckRows.length > 0) {
    const { data: hist } = await supabase
      .from("incident_status_history")
      .select("incident_id, created_at")
      .in(
        "incident_id",
        stuckRows.map((s) => s.id),
      )
      .order("created_at", { ascending: false });
    for (const h of hist ?? []) {
      if (!enteredAt.has(h.incident_id)) enteredAt.set(h.incident_id, h.created_at);
    }
  }
  const since = (s: { id: string; updated_at: string }) =>
    enteredAt.get(s.id) ?? s.updated_at;
  // Mais represadas primeiro (entrou na etapa atual há mais tempo).
  stuckRows.sort((a, b) => +new Date(since(a)) - +new Date(since(b)));

  return (
    <div className="space-y-7">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-navy-700">
          <TrendingUp className="h-7 w-7" /> Repriorizações
        </h1>
        <p className="mt-1 text-base text-muted">
          Histórico de mudanças de prioridade e tarefas pausadas — com o motivo
          do atraso registrado pela equipe.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Linha do tempo */}
        <div className="space-y-3 lg:col-span-7">
          <h2 className="font-label text-sm font-semibold uppercase tracking-wider text-faint">
            Linha do tempo
          </h2>
          <Card className="overflow-hidden">
            {timeline.length === 0 ? (
              <p className="px-6 py-14 text-center text-sm text-muted">
                Nenhuma repriorização registrada ainda.
              </p>
            ) : (
              timeline.map((e) => {
                const isPause = e.action === STATUS_PAUSE_ACTION;
                const label = isPause ? STATUS_LABELS : PRIORITY_LABELS;
                const from = label[e.details.from as keyof typeof label] ?? e.details.from;
                const to = label[e.details.to as keyof typeof label] ?? e.details.to;
                return (
                  <div
                    key={e.id}
                    className="flex gap-3 border-b border-border px-5 py-4 last:border-0"
                  >
                    <span
                      className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                        isPause
                          ? "bg-amber-50 text-amber-700"
                          : "bg-orange-50 text-orange-700"
                      }`}
                    >
                      {isPause ? (
                        <PauseCircle className="h-5 w-5" />
                      ) : (
                        <TrendingUp className="h-5 w-5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {e.target_id ? (
                          <Link
                            href={`/melhorias/${e.target_id}`}
                            className="hover:text-navy-700"
                          >
                            #{e.details.ref} — {e.details.title}
                          </Link>
                        ) : (
                          <>
                            #{e.details.ref} — {e.details.title}
                          </>
                        )}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        {isPause ? "Pausada" : "Prioridade"}: {from}
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-medium text-foreground">{to}</span>
                      </p>
                      {e.details.reason && (
                        <p className="mt-2 rounded-lg border border-border bg-surface-muted p-2.5 text-sm text-foreground">
                          “{e.details.reason}”
                        </p>
                      )}
                      <p className="mt-1.5 text-[11px] text-faint">
                        {e.actor_email ?? "—"} · {formatDateTime(e.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>

        {/* Represadas (aging) */}
        <div className="space-y-3 lg:col-span-5">
          <h2 className="font-label flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-faint">
            <Hourglass className="h-4 w-4" /> Represadas (paradas há mais tempo)
          </h2>
          <Card>
            <CardContent className="space-y-3 pt-5">
              {stuckRows.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">
                  Nenhuma melhoria em aberto.
                </p>
              ) : (
                stuckRows.map((s) => (
                  <Link
                    key={s.id}
                    href={`/melhorias/${s.id}`}
                    className="block rounded-lg border border-border p-3 transition-colors hover:bg-surface-muted"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-label text-[12px] font-bold text-navy-700">
                        #{s.ref}
                      </span>
                      <span className="font-label text-xs font-semibold text-amber-700">
                        nesta etapa há {formatDuration(since(s))}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-foreground">
                      {s.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={s.status as IncidentStatus} />
                      <PriorityBadge priority={s.priority as IncidentPriority} />
                      {s.systems?.name && (
                        <span className="text-xs text-muted">
                          · {s.systems.name}
                        </span>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
