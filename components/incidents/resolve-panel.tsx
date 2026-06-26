"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  resolveIncidentAction,
  type IncidentFormState,
} from "@/app/(app)/incidencias/actions";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { MediaUploader } from "@/components/media/media-uploader";
import type { TicketKind } from "@/lib/supabase/types";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="accent" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="h-4 w-4" />
      )}
      {label}
    </Button>
  );
}

export function ResolvePanel({
  incidentId,
  userId,
  kind = "incident",
}: {
  incidentId: string;
  userId: string;
  kind?: TicketKind;
}) {
  const isImprovement = kind === "improvement";
  const [state, formAction] = useActionState<IncidentFormState, FormData>(
    resolveIncidentAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="incidentId" value={incidentId} />
      <input type="hidden" name="kind" value={kind} />
      <div>
        <Label htmlFor="resolution">
          {isImprovement ? "Notas de entrega" : "Solução aplicada"}
        </Label>
        <Textarea
          id="resolution"
          name="resolution"
          rows={4}
          required
          placeholder={
            isImprovement
              ? "O que foi desenvolvido/entregue. Isso vira histórico e alimenta a IA."
              : "Descreva o que foi feito para resolver. Isso alimenta a base de conhecimento e a IA."
          }
        />
      </div>
      <div>
        <Label>Vídeo/imagens da solução (opcional)</Label>
        <MediaUploader userId={userId} name="attachments" />
      </div>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex justify-end">
        <SubmitButton
          label={isImprovement ? "Registrar entrega" : "Registrar solução"}
        />
      </div>
    </form>
  );
}
