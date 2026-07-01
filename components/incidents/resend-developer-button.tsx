"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Send } from "lucide-react";
import { resendDeveloperAction } from "@/app/(app)/incidencias/actions";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
      Reenviar ao desenvolvedor
    </Button>
  );
}

export function ResendDeveloperButton({ incidentId }: { incidentId: string }) {
  const [state, formAction] = useActionState<
    { error?: string; message?: string },
    FormData
  >(resendDeveloperAction, {});

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="incidentId" value={incidentId} />
      <SubmitButton />
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.message && (
        <p className="text-xs text-status-resolved">{state.message}</p>
      )}
    </form>
  );
}
