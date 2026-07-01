"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Send } from "lucide-react";
import {
  addCommentAction,
  type IncidentFormState,
} from "@/app/(app)/incidencias/actions";
import { Button } from "@/components/ui/button";
import { RichTextField } from "@/components/ui/rich-text";

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
  // Remonta o editor (limpa) após comentar com sucesso.
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    // Limpa o editor só após sucesso (preserva o texto se deu erro).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!state.error) setEditorKey((k) => k + 1);
  }, [state]);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="incidentId" value={incidentId} />
      <RichTextField
        key={editorKey}
        name="body"
        placeholder="Escreva um comentário..."
      />
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
