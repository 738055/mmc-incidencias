"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin", label: "Usuários" },
  { href: "/sistemas", label: "Sistemas" },
  { href: "/empresas", label: "Empresas parceiras" },
  { href: "/departamentos", label: "Departamentos" },
  { href: "/metricas", label: "Métricas" },
];

/** Barra de abas da área de Administração (Usuários · Sistemas · Empresas). */
export function AdminTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-6 overflow-x-auto border-b border-border">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "font-label -mb-px shrink-0 border-b-2 px-1 py-3 text-[13px] font-medium transition-colors",
              active
                ? "border-navy-700 text-navy-700"
                : "border-transparent text-muted hover:text-navy-700",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
