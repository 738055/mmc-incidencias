"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  createTutorialAction,
  editTutorialAction,
  type TutorialFormState,
} from "@/app/(app)/tutoriais/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { MediaUploader } from "@/components/media/media-uploader";
import { CATEGORIES } from "@/lib/domain";

type Option = { id: string; name: string };

type TutorialDefaults = {
  id: string;
  title: string;
  content: string | null;
  system_id: string | null;
  category: string | null;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="accent" size="lg" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}

export function TutorialForm({
  userId,
  systems,
  tutorial,
}: {
  userId: string;
  systems: Option[];
  tutorial?: TutorialDefaults;
}) {
  const isEdit = !!tutorial;
  const [state, formAction] = useActionState<TutorialFormState, FormData>(
    isEdit ? editTutorialAction : createTutorialAction,
    {},
  );

  return (
    <form action={formAction}>
      {isEdit && <input type="hidden" name="id" value={tutorial.id} />}
      <Card>
        <CardContent className="space-y-5 pt-5">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              defaultValue={tutorial?.title ?? ""}
              placeholder="Ex.: Como reconfigurar a VPN da filial"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="systemId">Sistema</Label>
              <Select
                id="systemId"
                name="systemId"
                defaultValue={tutorial?.system_id ?? ""}
              >
                <option value="">Selecione...</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select
                id="category"
                name="category"
                defaultValue={tutorial?.category ?? ""}
              >
                <option value="">Selecione...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="content">Passos / conteúdo</Label>
            <Textarea
              id="content"
              name="content"
              rows={8}
              maxLength={20000}
              defaultValue={tutorial?.content ?? ""}
              placeholder={
                "Descreva o passo a passo da solução. Ex.:\n1. Abrir o Cisco AnyConnect…\n2. …"
              }
            />
          </div>

          <div>
            <Label>{isEdit ? "Adicionar mais vídeo/imagens" : "Vídeo e imagens"}</Label>
            <MediaUploader userId={userId} name="media" />
          </div>

          {state.error && (
            <p className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <SubmitButton label={isEdit ? "Salvar alterações" : "Publicar tutorial"} />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
