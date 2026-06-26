"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { forgotPasswordAction, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="accent" className="w-full" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Enviar link de redefinição
    </Button>
  );
}

export function ForgotForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(
    forgotPasswordAction,
    {},
  );

  if (state.notice) {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-800 ring-1 ring-inset ring-green-200">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {state.notice}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@mmcturismo.com.br"
          required
        />
      </div>
      {state.error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
