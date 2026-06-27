"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Plus } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/supabase/types";
import { isStaff } from "@/lib/domain";
import { baseNav, adminNav, type NavItem } from "./nav-items";

/**
 * Navegação mobile/tablet (abaixo de `lg`): botão hambúrguer no topbar que abre
 * um drawer com o mesmo menu navy da sidebar. Fecha ao navegar e no `Esc`.
 */
export function MobileNav({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Fecha no Esc e trava o scroll do body enquanto aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  function NavLink({ href, label, icon: Icon }: NavItem) {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        className={cn(
          "font-label flex min-h-12 items-center gap-3 rounded-lg px-4 text-[15px] font-medium transition-colors",
          active
            ? "bg-orange-700 text-white shadow-sm"
            : "text-navy-200 hover:bg-navy-600/55 hover:text-white",
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0", active ? "text-white" : "text-navy-200")} />
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground transition-colors hover:bg-surface-muted lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Portado para o body: escapa do contexto de empilhamento do header
          (que tem backdrop-blur) e fica acima dos demais overlays (z-[60]). */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[60] lg:hidden">
            <div
              className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden
            />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] max-w-[82vw] flex-col border-r border-navy-600/40 bg-navy-800 px-5 py-6">
            <div className="mb-6 flex items-center justify-between">
              <Link href="/dashboard" onClick={() => setOpen(false)}>
                <Logo
                  variant="light"
                  title="MMC Portal"
                  subtitle="IT Management"
                  className="[&>span:first-child]:bg-navy-600/80"
                />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="grid h-9 w-9 place-items-center rounded-full text-navy-200 transition-colors hover:bg-navy-600/55 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto">
              {baseNav.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}

              {isStaff(role) && (
                <>
                  <p className="font-label px-4 pb-1 pt-5 text-[11px] font-medium uppercase text-navy-300/75">
                    Administração
                  </p>
                  {adminNav.map((item) => (
                    <NavLink key={item.href} {...item} />
                  ))}
                </>
              )}
            </nav>

            <div className="mt-6 border-t border-navy-500/40 pt-5">
              <Link
                href="/incidencias/nova"
                onClick={() => setOpen(false)}
                className="font-label flex min-h-12 items-center justify-center gap-3 rounded-lg bg-orange-700 px-4 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
              >
                <Plus className="h-5 w-5" /> Novo chamado
              </Link>
            </div>
          </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
