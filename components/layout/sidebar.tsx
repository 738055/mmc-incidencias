"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/supabase/types";
import { isStaff } from "@/lib/domain";
import { baseNav, adminNav, type NavItem } from "./nav-items";

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();

  function NavLink({ href, label, icon: Icon }: NavItem) {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        href={href}
        className={cn(
          "font-label flex min-h-12 items-center gap-3 rounded-lg px-4 text-[15px] font-medium transition-colors",
          active
            ? "bg-orange-700 text-white shadow-sm"
            : "text-navy-200 hover:bg-navy-600/55 hover:text-white",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5 shrink-0",
            active ? "text-white" : "text-navy-200",
          )}
        />
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col border-r border-navy-600/40 bg-navy-800 px-5 py-7 lg:flex">
      <Link href="/dashboard" className="mb-9 block">
        <Logo
          variant="light"
          title="MMC Portal"
          subtitle="IT Management"
          className="[&>span:first-child]:bg-navy-600/80"
        />
      </Link>

      <nav className="flex-1 space-y-2">
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

      <div className="mt-8 border-t border-navy-500/40 pt-5">
        <Link
          href="/incidencias/nova"
          className="font-label flex min-h-12 items-center justify-center gap-3 rounded-lg bg-orange-700 px-4 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
        >
          <Plus className="h-5 w-5" /> Novo chamado
        </Link>
      </div>
    </aside>
  );
}
