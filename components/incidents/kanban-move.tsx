"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  IMPROVEMENT_STATUS_ORDER,
  STATUS_LABELS,
  isPauseTransition,
} from "@/lib/domain";
import { updateStatusAction } from "@/app/(app)/incidencias/actions";
import type { IncidentStatus } from "@/lib/supabase/types";

/** Seletor de status no card do Kanban. Move a melhoria e atualiza a tela.
 *  Só é renderizado para quem pode mover (equipe ou parceiro). */
export function KanbanMove({
  incidentId,
  status,
}: {
  incidentId: string;
  status: IncidentStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function move(next: IncidentStatus) {
    if (next === status) return;

    // Pausar algo "em desenvolvimento" exige justificativa (a diretoria vê).
    // ponytail: prompt() nativo — trocar por modal se precisar de algo melhor.
    let reason = "";
    if (isPauseTransition(status, next)) {
      const r = window.prompt(
        "Esta tarefa está em desenvolvimento. Por que ela está sendo pausada/ultrapassada? (será registrado para a diretoria)",
      );
      if (r === null) return; // cancelou
      reason = r.trim();
      if (reason.length < 3) {
        window.alert("Informe um motivo (mín. 3 caracteres).");
        return;
      }
    }

    const fd = new FormData();
    fd.set("incidentId", incidentId);
    fd.set("status", next);
    if (reason) fd.set("reason", reason);
    startTransition(async () => {
      await updateStatusAction(fd);
      router.refresh();
    });
  }

  return (
    <select
      aria-label="Mover para"
      value={status}
      disabled={pending}
      onChange={(e) => move(e.target.value as IncidentStatus)}
      className="mt-3 h-8 w-full rounded-md border border-border bg-surface px-2 text-xs text-muted focus-visible:border-navy-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 disabled:opacity-50"
    >
      {IMPROVEMENT_STATUS_ORDER.map((s) => (
        <option key={s} value={s}>
          Mover para: {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
