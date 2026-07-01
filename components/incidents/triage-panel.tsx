"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { triageTicketAction } from "@/app/(app)/incidencias/actions";
import type { TicketKind } from "@/lib/supabase/types";

/** Modelo de especificação para completar a solicitação antes de enviar ao dev. */
const SPEC_TEMPLATE = `## Objetivo
<o que se quer alcançar>

## Situação atual
<como funciona hoje>

## Comportamento esperado
<como deve ficar>

## Critérios de aceite
- [ ]
- [ ]

## Escopo / notas técnicas
<observações para o dev>`;

/**
 * Portão de triagem do admin: aceitar (→ aciona o desenvolvedor) ou recusar
 * (motivo obrigatório). Aparece só para admin enquanto o chamado aguarda análise.
 * Em melhorias, pré-preenche um modelo de especificação: o admin completa a
 * solicitação num formato único, que vai ao dev e fica registrado no chamado.
 */
export function TriagePanel({
  incidentId,
  kind,
}: {
  incidentId: string;
  kind: TicketKind;
}) {
  const router = useRouter();
  const isImprovement = kind === "improvement";
  const [note, setNote] = useState(isImprovement ? SPEC_TEMPLATE : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(decision: "accept" | "reject") {
    setError(null);
    if (decision === "reject") {
      if (note.trim().length < 3 || note.trim() === SPEC_TEMPLATE.trim()) {
        setError("Para recusar, limpe o modelo e informe o motivo (mín. 3 caracteres).");
        return;
      }
    }
    const fd = new FormData();
    fd.set("incidentId", incidentId);
    fd.set("decision", decision);
    fd.set("note", note);
    startTransition(async () => {
      const res = await triageTicketAction({}, fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-base font-semibold text-navy-700">
        <ShieldQuestion className="h-[18px] w-[18px] text-orange-600" />
        Triagem — analisar viabilidade
      </h2>
      <p className="text-sm text-muted">
        {isImprovement ? (
          <>
            <strong>Complete a solicitação</strong> no modelo abaixo. Ao{" "}
            <strong>aceitar</strong>, essa especificação vai ao desenvolvedor por
            e-mail e fica registrada no chamado. Ao <strong>recusar</strong>,
            limpe o modelo e informe o motivo.
          </>
        ) : (
          <>
            Decida a viabilidade. Ao <strong>aceitar</strong>, o desenvolvedor do
            sistema é avisado por e-mail. Ao <strong>recusar</strong>, informe o
            motivo (ex.: duplicidade, não é um defeito).
          </>
        )}
      </p>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={isImprovement ? 14 : 3}
        disabled={pending}
        className={isImprovement ? "font-mono text-sm" : undefined}
        placeholder="Observação/refinamento (opcional no aceite) — motivo é obrigatório na recusa"
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="accent"
          className="flex-1"
          disabled={pending}
          onClick={() => submit("accept")}
        >
          <CheckCircle2 className="h-4 w-4" /> Aceitar e enviar ao dev
        </Button>
        <Button
          type="button"
          variant="danger"
          className="flex-1"
          disabled={pending}
          onClick={() => submit("reject")}
        >
          <XCircle className="h-4 w-4" /> Recusar
        </Button>
      </div>
    </div>
  );
}
