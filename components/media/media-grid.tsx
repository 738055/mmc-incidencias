import Image from "next/image";
import { FileText } from "lucide-react";

export type MediaItem = {
  url?: string;
  name: string;
  mime: string;
};

/**
 * Renderiza uma grade de mídia a partir de URLs assinadas (geradas no servidor).
 * Imagens viram <img>, vídeos viram <video controls> (streaming via range do
 * Supabase Storage), e outros tipos viram um link de arquivo.
 */
export function MediaGrid({ items }: { items: MediaItem[] }) {
  if (!items.length) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((m, i) => {
        const isImg = m.mime.startsWith("image/");
        const isVid = m.mime.startsWith("video/");

        if (isVid && m.url) {
          return (
            <video
              key={i}
              controls
              preload="metadata"
              className="aspect-video w-full rounded-lg border border-border bg-black sm:col-span-2"
            >
              <source src={m.url} type={m.mime} />
              Seu navegador não suporta a reprodução deste vídeo.
            </video>
          );
        }

        if (isImg && m.url) {
          return (
            <a
              key={i}
              href={m.url}
              target="_blank"
              rel="noreferrer"
              className="group block overflow-hidden rounded-lg border border-border transition-colors hover:border-navy-300"
            >
              <Image
                src={m.url}
                alt={m.name}
                width={400}
                height={280}
                className="h-40 w-full object-cover transition-transform group-hover:scale-105"
                unoptimized
              />
            </a>
          );
        }

        return (
          <a
            key={i}
            href={m.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-navy-700 transition-colors hover:border-navy-300"
          >
            <FileText className="h-4 w-4 shrink-0 text-faint" />
            <span className="truncate">{m.name}</span>
          </a>
        );
      })}
    </div>
  );
}
