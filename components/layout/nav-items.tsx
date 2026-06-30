import {
  LayoutDashboard,
  Ticket,
  Rocket,
  BookOpen,
  GraduationCap,
  Bot,
  Server,
  Users,
  Building2,
  KanbanSquare,
  TrendingUp,
} from "lucide-react";
import type { UserRole } from "@/lib/supabase/types";

/** Itens de navegação compartilhados entre a sidebar (desktop) e o drawer (mobile). */

export type NavItem = { href: string; label: string; icon: typeof Ticket };

export const baseNav: NavItem[] = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/incidencias", label: "Incidências", icon: Ticket },
  { href: "/melhorias", label: "Melhorias", icon: Rocket },
  { href: "/base-conhecimento", label: "Base de conhecimento", icon: BookOpen },
  { href: "/tutoriais", label: "Tutoriais", icon: GraduationCap },
  { href: "/assistente", label: "Assistente IA", icon: Bot },
];

export const adminNav: NavItem[] = [
  { href: "/repriorizacoes", label: "Repriorizações", icon: TrendingUp },
  { href: "/sistemas", label: "Sistemas", icon: Server },
  { href: "/empresas", label: "Empresas parceiras", icon: Building2 },
  { href: "/admin", label: "Usuários", icon: Users },
];

/** Menu enxuto do desenvolvedor parceiro: só o que a RLS deixa ele usar. */
export const partnerNav: NavItem[] = [
  { href: "/melhorias/quadro", label: "Quadro de melhorias", icon: KanbanSquare },
  { href: "/melhorias", label: "Melhorias", icon: Rocket },
  { href: "/base-conhecimento", label: "Base de conhecimento", icon: BookOpen },
];

export function navFor(role: UserRole): NavItem[] {
  return role === "partner" ? partnerNav : baseNav;
}
