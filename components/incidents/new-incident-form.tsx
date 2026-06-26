"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  createIncidentAction,
  type IncidentFormState,
} from "@/app/(app)/incidencias/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { MediaUploader } from "@/components/media/media-uploader";
import { CATEGORIES, PRIORITY_LABELS, PRIORITY_ORDER } from "@/lib/domain";
import type { TicketKind } from "@/lib/supabase/types";

type Option = { id: string; name: string };

function SubmitButton({ kind }: { kind: TicketKind }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="accent" size="lg" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {kind === "improvement" ? "Enviar solicitação" : "Abrir chamado"}
    </Button>
  );
}

export function NewTicketForm({
  kind = "incident",
  userId,
  systems,
  companies,
}: {
  kind?: TicketKind;
  userId: string;
  systems: Option[];
  companies: Option[];
}) {
  const isImprovement = kind === "improvement";
  const [state, formAction] = useActionState<IncidentFormState, FormData>(
    createIncidentAction,
    {},
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="kind" value={kind} />

      <Card>
        <CardContent className="space-y-5 pt-5">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={160}
              placeholder={
                isImprovement
                  ? "Resumo da melhoria desejada"
                  : "Resumo do problema"
              }
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              name="description"
              required
              rows={6}
              placeholder={
                isImprovement
                  ? "O que deve ser feito? Comportamento atual x desejado, telas/fluxos afetados..."
                  : "O que aconteceu? Passos para reproduzir, mensagens de erro, quando começou..."
              }
            />
          </div>

          {isImprovement && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="stakeholderArea">Stakeholder / área solicitante</Label>
                <Input
                  id="stakeholderArea"
                  name="stakeholderArea"
                  maxLength={120}
                  placeholder="Ex.: Comercial, Financeiro, Operações"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="benefit">Justificativa / benefício esperado</Label>
                <Textarea
                  id="benefit"
                  name="benefit"
                  rows={2}
                  maxLength={2000}
                  placeholder="Ex.: reduzir em 30% o tempo de emissão de reservas"
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="systemId">Sistema</Label>
              <Select id="systemId" name="systemId" defaultValue="">
                <option value="">Selecione...</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">
                {isImprovement ? "Impacto no negócio *" : "Prioridade *"}
              </Label>
              <Select id="priority" name="priority" defaultValue="medium" required>
                {PRIORITY_ORDER.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </Select>
            </div>
            {!isImprovement && (
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select id="category" name="category" defaultValue="">
                  <option value="">Selecione...</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="companyId">
                {isImprovement ? "Empresa de desenvolvimento" : "Empresa parceira"}
              </Label>
              <Select id="companyId" name="companyId" defaultValue="">
                <option value="">
                  {isImprovement ? "Nenhuma (interno)" : "Nenhuma (suporte interno)"}
                </option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-muted">
                Se selecionada, a empresa recebe a solicitação por e-mail.
              </p>
            </div>
          </div>

          {/* Anexos */}
          <div>
            <Label>Anexos (imagens, vídeos ou PDF)</Label>
            <MediaUploader
              userId={userId}
              name="attachments"
              accept="image/*,video/*,application/pdf"
            />
          </div>

          {state.error && (
            <p className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <SubmitButton kind={kind} />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
