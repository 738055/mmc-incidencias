"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Send } from "lucide-react";
import {
  addCommentAction,
  type IncidentFormState,
} from "@/app/(app)/incidencias/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
      Comentar
    </Button>
  );
}

export function CommentForm({ incidentId }: { incidentId: string }) {
  const [state, formAction] = useActionState<IncidentFormState, FormData>(
    addCommentAction,
    {},
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-2">
      <input type="hidden" name="incidentId" value={incidentId} />
      <Textarea
        name="body"
        rows={3}
        required
        maxLength={4000}
        placeholder="Escreva um comentário..."
      />
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
