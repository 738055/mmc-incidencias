import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Paginação simples (anterior / página X de Y / próxima). Renderizada no
 * servidor; `hrefForPage` monta a URL preservando os filtros atuais.
 */
export function Pagination({
  page,
  totalPages,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (p: number) => string;
}) {
  if (totalPages <= 1) return null;

  const base =
    "font-label inline-flex h-10 items-center gap-1 rounded-lg px-4 text-[12px] font-medium ring-1 ring-inset transition-colors";
  const enabled = "bg-surface text-navy-700 ring-border hover:bg-navy-50";
  const disabled = "cursor-not-allowed bg-surface-muted text-faint ring-border";

  return (
    <nav className="flex items-center justify-between gap-2">
      {page > 1 ? (
        <Link href={hrefForPage(page - 1)} className={cn(base, enabled)}>
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Link>
      ) : (
        <span className={cn(base, disabled)}>
          <ChevronLeft className="h-4 w-4" /> Anterior
        </span>
      )}

      <span className="font-label text-[12px] text-muted">
        Página {page} de {totalPages}
      </span>

      {page < totalPages ? (
        <Link href={hrefForPage(page + 1)} className={cn(base, enabled)}>
          Próxima <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cn(base, disabled)}>
          Próxima <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
