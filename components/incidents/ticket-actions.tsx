"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { statusOrderFor, STATUS_LABELS } from "@/lib/domain";
import {
  assignToMeAction,
  updateStatusAction,
} from "@/app/(app)/incidencias/actions";
import type { IncidentStatus, TicketKind } from "@/lib/supabase/types";

/**
 * Painel "Ações" da equipe (atribuir / mudar status). Client component para
 * garantir a atualização imediata da tela: chama a server action e em seguida
 * `router.refresh()` — sem depender só do revalidatePath (que nem sempre
 * re-renderiza a rota atual sem navegação).
 */
export function TicketActions({
  incidentId,
  kind,
  status,
  assigned,
}: {
  incidentId: string;
  kind: TicketKind;
  status: IncidentStatus;
  assigned: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState<IncidentStatus>(status);
  const [pending, startTransition] = useTransition();

  function assign() {
    const fd = new FormData();
    fd.set("incidentId", incidentId);
    startTransition(async () => {
      await assignToMeAction(fd);
      router.refresh();
    });
  }

  function save() {
    const fd = new FormData();
    fd.set("incidentId", incidentId);
    fd.set("status", value);
    startTransition(async () => {
      await updateStatusAction(fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
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
            value={value}
            onChange={(e) => setValue(e.target.value as IncidentStatus)}
            disabled={pending}
            className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm focus-visible:border-navy-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600"
          >
            {statusOrderFor(kind).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" disabled={pending || value === status} onClick={save}>
            {pending ? "..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
