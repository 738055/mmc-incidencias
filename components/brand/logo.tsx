import { cn } from "@/lib/utils";

/** Logotipo da marca: monograma MMC + nome. Usado no topo e nas telas de auth. */
export function Logo({
  className,
  variant = "dark",
  showText = true,
  title = "Incidências",
  subtitle = "Tecnologia & Inovação",
}: {
  className?: string;
  variant?: "dark" | "light";
  showText?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const text = variant === "light" ? "text-white" : "text-navy-700";
  const sub = variant === "light" ? "text-navy-200" : "text-muted";
  const mark =
    variant === "light"
      ? "bg-orange-700 text-white"
      : "brand-gradient text-white";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "grid h-10 w-10 place-items-center rounded-lg text-sm font-bold tracking-tight shadow-sm",
          mark,
        )}
      >
        MMC
      </span>
      {showText && (
        <span className="leading-tight">
          <span className={cn("block text-base font-bold", text)}>{title}</span>
          <span className={cn("block text-xs", sub)}>{subtitle}</span>
        </span>
      )}
    </div>
  );
}
