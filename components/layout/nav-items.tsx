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
} from "lucide-react";

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
  { href: "/sistemas", label: "Sistemas", icon: Server },
  { href: "/empresas", label: "Empresas parceiras", icon: Building2 },
  { href: "/admin", label: "Usuários", icon: Users },
];
