"use client";

import { useState, useTransition } from "react";
import { setRoleAction } from "@/app/(app)/admin/actions";
import { ROLE_LABELS } from "@/lib/domain";
import type { UserRole } from "@/lib/supabase/types";

const ROLES: UserRole[] = ["requester", "technician", "admin", "partner"];

/**
 * Papel do usuário. Controlado: salva automaticamente a cada mudança (sem botão
 * Salvar / sem precisar atualizar a tela). Desabilitado para o próprio usuário.
 */
export function RoleSelect({
  userId,
  current,
  disabled,
}: {
  userId: string;
  current: UserRole;
  disabled?: boolean;
}) {
  const [value, setValue] = useState<UserRole>(current);
  const [pending, startTransition] = useTransition();

  function onChange(next: UserRole) {
    setValue(next);
    const fd = new FormData();
    fd.set("id", userId);
    fd.set("role", next);
    startTransition(() => setRoleAction(fd));
  }

  return (
    <select
      value={value}
      disabled={disabled || pending}
      onChange={(e) => onChange(e.target.value as UserRole)}
      className="h-10 rounded-lg border border-border bg-surface px-3 text-sm shadow-sm disabled:opacity-50"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </select>
  );
}
