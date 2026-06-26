"use client";

import { useRef, useState } from "react";
import { Loader2, Paperclip, X, ImageIcon, Film, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  ACCEPT_IMAGE_VIDEO,
  imageToWebp,
  isImage,
  isVideo,
  maxSizeMbFor,
  mediaKind,
  humanSize,
} from "@/lib/media";

export type UploadedMedia = {
  path: string;
  name: string;
  mime: string;
  size: number;
  kind: "image" | "video" | "file";
};

/**
 * Uploader reutilizável: aceita imagens (convertidas para WebP) e vídeos,
 * envia direto ao Supabase Storage (sem passar pelo Vercel) e mantém a lista
 * num input hidden (`name`) em JSON para a Server Action consumir.
 */
export function MediaUploader({
  userId,
  name = "attachments",
  accept = ACCEPT_IMAGE_VIDEO,
  label = "Adicionar imagens ou vídeos",
}: {
  userId: string;
  name?: string;
  accept?: string;
  label?: string;
}) {
  const [files, setFiles] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function handleFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    setError(null);
    setUploading(true);
    const supabase = createClient();

    try {
      const next: UploadedMedia[] = [];
      for (const original of Array.from(selected)) {
        // Imagens viram WebP no navegador; vídeos/PDF seguem como estão.
        const file = await imageToWebp(original);

        const limit = maxSizeMbFor(file.type);
        if (file.size > limit * 1024 * 1024) {
          setError(`"${original.name}" excede ${limit} MB.`);
          continue;
        }

        setProgress(`Enviando ${file.name}…`);
        const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const path = `${userId}/${crypto.randomUUID()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from("attachments")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) {
          setError(`Falha ao enviar "${original.name}".`);
          continue;
        }
        next.push({
          path,
          name: file.name,
          mime: file.type,
          size: file.size,
          kind: mediaKind(file.type),
        });
      }
      setFiles((prev) => [...prev, ...next]);
    } finally {
      setUploading(false);
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(path: string) {
    const supabase = createClient();
    await supabase.storage.from("attachments").remove([path]);
    setFiles((prev) => prev.filter((f) => f.path !== path));
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(files)} />
      <div className="rounded-lg border border-dashed border-border p-4">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 text-sm font-medium text-navy-700 hover:text-orange-600 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
          {uploading ? (progress ?? "Enviando…") : label}
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {files.length > 0 && (
          <ul className="mt-3 space-y-2">
            {files.map((f) => {
              const Icon = isImage(f.mime)
                ? ImageIcon
                : isVideo(f.mime)
                  ? Film
                  : FileText;
              return (
                <li
                  key={f.path}
                  className="flex items-center justify-between gap-2 rounded-md bg-surface-muted px-3 py-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-navy-500" />
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0 text-xs text-faint">
                      {humanSize(f.size)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(f.path)}
                    className="text-muted hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="mt-1.5 text-xs text-muted">
        Imagens são convertidas para WebP. Vídeos: MP4/WebM/MOV até 200 MB.
      </p>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
