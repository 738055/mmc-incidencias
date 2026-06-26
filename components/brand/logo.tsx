import { cn } from "@/lib/utils";

/** Logotipo da marca: monograma MMC + nome. Usado no topo e nas telas de auth. */
export function Logo({
  className,
  variant = "dark",
  showText = true,
}: {
  className?: string;
  variant?: "dark" | "light";
  showText?: boolean;
}) {
  const text = variant === "light" ? "text-white" : "text-navy-700";
  const sub = variant === "light" ? "text-navy-200" : "text-muted";
  const mark =
    variant === "light"
      ? "bg-orange-500 text-white"
      : "brand-gradient text-white";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid h-9 w-9 place-items-center rounded-lg text-sm font-bold tracking-tight shadow-sm",
          mark,
        )}
      >
        MMC
      </span>
      {showText && (
        <span className="leading-tight">
          <span className={cn("block text-sm font-semibold", text)}>
            Incidências
          </span>
          <span className={cn("block text-[11px]", sub)}>
            Tecnologia &amp; Inovação
          </span>
        </span>
      )}
    </div>
  );
}
