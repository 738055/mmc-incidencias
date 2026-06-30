"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  statusOrderFor,
  STATUS_LABELS,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  isPauseTransition,
} from "@/lib/domain";
import {
  assignToMeAction,
  updateStatusAction,
  updatePriorityAction,
} from "@/app/(app)/incidencias/actions";
import type {
  IncidentPriority,
  IncidentStatus,
  TicketKind,
} from "@/lib/supabase/types";

/**
 * Painel "Ações" da equipe (atribuir / mudar status / repriorizar). Client
 * component para atualização imediata (action + `router.refresh()`).
 * Pausa de melhoria e mudança de prioridade exigem MOTIVO (vai p/ a diretoria).
 */
export function TicketActions({
  incidentId,
  kind,
  status,
  priority,
  assigned,
}: {
  incidentId: string;
  kind: TicketKind;
  status: IncidentStatus;
  priority: IncidentPriority;
  assigned: boolean;
}) {
  const router = useRouter();
  const [statusValue, setStatusValue] = useState<IncidentStatus>(status);
  const [priorityValue, setPriorityValue] = useState<IncidentPriority>(priority);
  const [pending, startTransition] = useTransition();

  function assign() {
    const fd = new FormData();
    fd.set("incidentId", incidentId);
    startTransition(async () => {
      await assignToMeAction(fd);
      router.refresh();
    });
  }

  // ponytail: prompt() nativo p/ o motivo — trocar por modal se necessário.
  function askReason(message: string): string | null {
    const r = window.prompt(message);
    if (r === null) return null;
    const reason = r.trim();
    if (reason.length < 3) {
      window.alert("Informe um motivo (mín. 3 caracteres).");
      return null;
    }
    return reason;
  }

  function saveStatus() {
    let reason = "";
    if (isPauseTransition(status, statusValue)) {
      const r = askReason(
        "Por que esta tarefa em desenvolvimento está sendo pausada/ultrapassada? (registrado para a diretoria)",
      );
      if (r === null) return;
      reason = r;
    }
    const fd = new FormData();
    fd.set("incidentId", incidentId);
    fd.set("status", statusValue);
    if (reason) fd.set("reason", reason);
    startTransition(async () => {
      await updateStatusAction(fd);
      router.refresh();
    });
  }

  function savePriority() {
    const reason = askReason(
      "Motivo da repriorização (ex.: entrou o pedido do cliente X na frente):",
    );
    if (reason === null) return;
    const fd = new FormData();
    fd.set("incidentId", incidentId);
    fd.set("priority", priorityValue);
    fd.set("reason", reason);
    startTransition(async () => {
      await updatePriorityAction(fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {!assigned && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={assign}
        >
          Atribuir a mim
        </Button>
      )}

      <div className="space-y-2">
        <label className="font-label text-xs font-medium uppercase tracking-wider text-faint">
          Alterar status
        </label>
        <div className="flex gap-2">
          <select
            value={statusValue}
            onChange={(e) => setStatusValue(e.target.value as IncidentStatus)}
            disabled={pending}
            className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm focus-visible:border-navy-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600"
          >
            {statusOrderFor(kind).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            disabled={pending || statusValue === status}
            onClick={saveStatus}
          >
            {pending ? "..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="font-label text-xs font-medium uppercase tracking-wider text-faint">
          Prioridade
        </label>
        <div className="flex gap-2">
          <select
            value={priorityValue}
            onChange={(e) =>
              setPriorityValue(e.target.value as IncidentPriority)
            }
            disabled={pending}
            className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm focus-visible:border-navy-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600"
          >
            {PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || priorityValue === priority}
            onClick={savePriority}
          >
            {pending ? "..." : "Repriorizar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
