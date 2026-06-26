/**
 * Utilitários de mídia (lado do cliente).
 * - Conversão de imagens para WebP no navegador (reduz tamanho/banda).
 * - Classificação e limites de upload.
 */

import type { MediaKind } from "@/lib/supabase/types";

export const MAX_IMAGE_MB = 15;
export const MAX_VIDEO_MB = 200;

export const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const VIDEO_MIMES = ["video/mp4", "video/webm", "video/quicktime"];
export const DOC_MIMES = ["application/pdf"];

/** `accept` para inputs de arquivo. */
export const ACCEPT_MEDIA = [...IMAGE_MIMES, ...VIDEO_MIMES, ...DOC_MIMES].join(",");
export const ACCEPT_IMAGE_VIDEO = [...IMAGE_MIMES, ...VIDEO_MIMES].join(",");

export function mediaKind(mime: string): MediaKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "file";
}

export function isImage(mime: string) {
  return mime.startsWith("image/");
}
export function isVideo(mime: string) {
  return mime.startsWith("video/");
}

/** Limite (em MB) conforme o tipo do arquivo. */
export function maxSizeMbFor(mime: string) {
  if (isVideo(mime)) return MAX_VIDEO_MB;
  return MAX_IMAGE_MB;
}

/**
 * Converte uma imagem para WebP no navegador, redimensionando se for muito
 * grande. GIFs (possível animação) e não-imagens passam intactos. Em caso de
 * falha, retorna o arquivo original.
 */
export async function imageToWebp(
  file: File,
  maxDim = 2400,
  quality = 0.9,
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.type === "image/webp" && file.size < 1_000_000) return file;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const largest = Math.max(width, height);
    if (largest > maxDim) {
      const scale = maxDim / largest;
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (!blob) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp" });
  } catch {
    return file;
  }
}

export function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
