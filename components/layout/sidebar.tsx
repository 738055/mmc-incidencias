"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  Rocket,
  BookOpen,
  GraduationCap,
  Server,
  Users,
  Building2,
  PlusCircle,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/supabase/types";
import { isStaff } from "@/lib/domain";

const baseNav = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/incidencias", label: "Incidências", icon: Ticket },
  { href: "/melhorias", label: "Melhorias", icon: Rocket },
  { href: "/base-conhecimento", label: "Base de conhecimento", icon: BookOpen },
  { href: "/tutoriais", label: "Tutoriais", icon: GraduationCap },
];

const adminNav = [
  { href: "/sistemas", label: "Sistemas", icon: Server },
  { href: "/empresas", label: "Empresas parceiras", icon: Building2 },
  { href: "/admin", label: "Usuários", icon: Users },
];

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();

  function NavLink({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: typeof Ticket;
  }) {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors",
          active
            ? "bg-orange-500 font-semibold text-white shadow-sm"
            : "font-medium text-navy-200 hover:bg-navy-600/50 hover:text-white",
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
        {label}
      </Link>
    );
  }

  return (
    <aside className="hidden w-72 shrink-0 flex-col bg-navy-700 p-4 lg:flex">
      <div className="mb-6 flex h-12 items-center px-2">
        <Link href="/dashboard">
          <Logo variant="light" />
        </Link>
      </div>

      <Link
        href="/incidencias/nova"
        className="mb-6 flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        <PlusCircle className="h-4 w-4" /> Novo chamado
      </Link>

      <nav className="flex-1 space-y-1">
        {baseNav.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}

        {isStaff(role) && (
          <>
            <p className="font-label px-4 pb-1 pt-5 text-[11px] font-medium uppercase tracking-wider text-navy-300/70">
              Administração
            </p>
            {adminNav.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </>
        )}
      </nav>

      <div className="mt-auto border-t border-navy-500/40 px-2 pt-4 text-[11px] text-navy-300/70">
        MMC Incidências · v1.0
      </div>
    </aside>
  );
}
