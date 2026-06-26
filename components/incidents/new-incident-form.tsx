"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Paperclip, X, ImageIcon } from "lucide-react";
import {
  createIncidentAction,
  type IncidentFormState,
} from "@/app/(app)/incidencias/actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { CATEGORIES, PRIORITY_LABELS, PRIORITY_ORDER } from "@/lib/domain";
import type { TicketKind } from "@/lib/supabase/types";

type Option = { id: string; name: string };
type Uploaded = { path: string; name: string; mime: string; size: number };

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
  const [files, setFiles] = useState<Uploaded[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    setUploadError(null);
    setUploading(true);
    const supabase = createClient();

    try {
      const next: Uploaded[] = [];
      for (const file of Array.from(selected)) {
        if (file.size > 10 * 1024 * 1024) {
          setUploadError(`"${file.name}" excede 10 MB.`);
          continue;
        }
        const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const path = `${userId}/${crypto.randomUUID()}-${safe}`;
        const { error } = await supabase.storage
          .from("attachments")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) {
          setUploadError(`Falha ao enviar "${file.name}".`);
          continue;
        }
        next.push({ path, name: file.name, mime: file.type, size: file.size });
      }
      setFiles((prev) => [...prev, ...next]);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function removeFile(path: string) {
    const supabase = createClient();
    await supabase.storage.from("attachments").remove([path]);
    setFiles((prev) => prev.filter((f) => f.path !== path));
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="attachments" value={JSON.stringify(files)} />

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
            <Label>Anexos (imagens/PDF)</Label>
            <div className="rounded-lg border border-dashed border-border p-4">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="flex w-full items-center justify-center gap-2 text-sm font-medium text-navy-700 hover:text-orange-600 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
                {uploading ? "Enviando..." : "Adicionar arquivos"}
              </button>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />

              {files.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {files.map((f) => (
                    <li
                      key={f.path}
                      className="flex items-center justify-between gap-2 rounded-md bg-navy-50 px-3 py-2 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <ImageIcon className="h-4 w-4 shrink-0 text-navy-500" />
                        <span className="truncate">{f.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(f.path)}
                        className="text-muted hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {uploadError && (
              <p className="mt-1.5 text-xs text-red-600">{uploadError}</p>
            )}
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
