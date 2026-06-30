import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina classes do Tailwind de forma segura (evita conflitos). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata uma data ISO para pt-BR (dd/mm/aaaa hh:mm). */
export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

/** Duração legível em pt-BR entre dois instantes (ex.: "12d 4h", "3h", "<1h"). */
export function formatDuration(
  fromIso: string | Date,
  toIso: string | Date = new Date(),
) {
  const from = typeof fromIso === "string" ? new Date(fromIso) : fromIso;
  const to = typeof toIso === "string" ? new Date(toIso) : toIso;
  const ms = Math.max(0, to.getTime() - from.getTime());
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return `${hours}h`;
  const mins = Math.floor(ms / 60_000);
  return mins > 0 ? `${mins}min` : "<1min";
}

/** Tempo relativo simples em pt-BR (ex.: "há 3 horas"). */
export function timeAgo(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `há ${days} d`;
  return formatDateTime(d);
}
