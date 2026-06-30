"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertCircle,
  Loader2,
  UserPlus,
  Copy,
  Check,
  MailCheck,
  MailX,
} from "lucide-react";
import {
  createUserAction,
  type CreateUserState,
} from "@/app/(app)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { ROLE_LABELS } from "@/lib/domain";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="accent" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      Criar usuário
    </Button>
  );
}

export function CreateUserForm({
  companies,
}: {
  companies: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState<CreateUserState, FormData>(
    createUserAction,
    {},
  );
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState("requester");

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-4">
      <form action={formAction} className="grid gap-3 sm:grid-cols-[1.3fr_1.3fr_1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="fullName">Nome</Label>
          <Input id="fullName" name="fullName" required placeholder="Nome completo" />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required placeholder="pessoa@empresa.com" />
          <p className="mt-1 text-xs text-muted">
            Convites aceitam qualquer domínio (inclusive parceiros externos).
          </p>
        </div>
        <div>
          <Label htmlFor="role">Papel</Label>
          <Select
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {(["requester", "technician", "admin", "partner"] as const).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </div>
        {role === "partner" && (
          <div className="sm:col-span-4">
            <Label htmlFor="companyId">Empresa do desenvolvedor</Label>
            <Select id="companyId" name="companyId" defaultValue="">
              <option value="" disabled>
                Selecione a empresa…
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-muted">
              O parceiro só verá e moverá as melhorias desta empresa.
            </p>
          </div>
        )}
        <SubmitButton />
      </form>

      {state.error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
        </p>
      )}

      {state.tempPassword && (
        <div className="rounded-lg bg-green-50 p-4 ring-1 ring-inset ring-green-200">
          <p className="text-sm font-medium text-green-800">
            Usuário criado: {state.createdEmail}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-green-700">
            {state.emailSent ? (
              <>
                <MailCheck className="h-3.5 w-3.5" /> Senha inicial enviada por
                e-mail.
              </>
            ) : (
              <>
                <MailX className="h-3.5 w-3.5" /> E-mail não enviado. Repasse a
                senha abaixo com segurança.
              </>
            )}
          </p>
          {!state.emailSent && state.emailError && (
            <p className="mt-1 text-xs text-amber-700">
              Motivo: {state.emailError}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded-md bg-white px-3 py-2 font-mono text-sm text-navy-700 ring-1 ring-inset ring-green-200">
              {state.tempPassword}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => copy(state.tempPassword!)}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
