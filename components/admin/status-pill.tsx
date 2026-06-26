import { cn } from "@/lib/utils";

/** Pílula de status com bolinha colorida, no estilo das tabelas do template. */
export function StatusPill({
  active,
  labels = ["Ativo", "Inativo"],
}: {
  active: boolean;
  labels?: [string, string];
}) {
  return (
    <span
      className={cn(
        "font-label inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]",
        active
          ? "bg-status-resolved/10 text-status-resolved"
          : "bg-surface-sunken text-muted",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-status-resolved" : "bg-faint",
        )}
      />
      {active ? labels[0] : labels[1]}
    </span>
  );
}
