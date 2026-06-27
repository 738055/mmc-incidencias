"use client";

import { useState, useTransition } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { rateAiSuggestionAction } from "@/app/(app)/incidencias/actions";

/**
 * Avaliação (👍/👎) da sugestão de IA, visível só à equipe. Alimenta o
 * aprendizado: soluções rejeitadas com frequência deixam de ser sugeridas.
 */
export function AiFeedback({
  incidentId,
  initial,
}: {
  incidentId: string;
  initial: boolean | null;
}) {
  const [vote, setVote] = useState<boolean | null>(initial);
  const [isPending, startTransition] = useTransition();

  function rate(helpful: boolean) {
    setVote(helpful); // otimista
    const fd = new FormData();
    fd.set("incidentId", incidentId);
    fd.set("helpful", String(helpful));
    startTransition(() => rateAiSuggestionAction(fd));
  }

  return (
    <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted">
      <span>Esta sugestão ajudou?</span>
      <button
        type="button"
        onClick={() => rate(true)}
        disabled={isPending}
        title="Útil"
        className={cn(
          "grid h-7 w-7 place-items-center rounded-lg transition-colors hover:bg-surface",
          vote === true ? "bg-green-50 text-green-600" : "text-faint",
        )}
      >
        <ThumbsUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => rate(false)}
        disabled={isPending}
        title="Não ajudou"
        className={cn(
          "grid h-7 w-7 place-items-center rounded-lg transition-colors hover:bg-surface",
          vote === false ? "bg-red-50 text-red-600" : "text-faint",
        )}
      >
        <ThumbsDown className="h-4 w-4" />
      </button>
    </div>
  );
}
