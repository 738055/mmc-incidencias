"use client";

import { useState, useTransition } from "react";
import { setDepartmentAction } from "@/app/(app)/admin/actions";

/**
 * Vínculo usuário → departamento. Controlado: reflete a escolha na hora e salva
 * automaticamente a cada mudança (sem botão Salvar / sem precisar atualizar a tela).
 */
export function DepartmentSelect({
  userId,
  current,
  departments,
}: {
  userId: string;
  current: string | null;
  departments: { id: string; name: string }[];
}) {
  const [value, setValue] = useState(current ?? "");
  const [pending, startTransition] = useTransition();

  function onChange(next: string) {
    setValue(next);
    const fd = new FormData();
    fd.set("id", userId);
    fd.set("departmentId", next);
    startTransition(() => setDepartmentAction(fd));
  }

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-lg border border-border bg-surface px-3 text-sm shadow-sm disabled:opacity-50"
    >
      <option value="">—</option>
      {departments.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name}
        </option>
      ))}
    </select>
  );
}
