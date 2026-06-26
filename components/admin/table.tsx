/** Cabeçalho de coluna das tabelas de administração (rótulo mono, uppercase). */
export function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-6 py-4 font-label text-[11px] font-medium uppercase text-muted ${className}`}
    >
      {children}
    </th>
  );
}
