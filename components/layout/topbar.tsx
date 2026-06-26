import Link from "next/link";
import { LogOut, User, Search, Bell, HelpCircle } from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS } from "@/lib/domain";
import type { Profile } from "@/lib/supabase/types";

export async function Topbar({ profile }: { profile: Profile }) {
  const initials = (profile.full_name || profile.email)
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("read", false);
  const unread = count ?? 0;

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-surface/90 px-5 backdrop-blur lg:px-8">
      <div className="lg:hidden">
        <Link href="/incidencias/nova" className="text-sm font-semibold text-orange-600">
          + Novo chamado
        </Link>
      </div>

      <Link
        href="/incidencias"
        className="hidden h-9 w-72 items-center gap-2 rounded-full border border-border bg-surface-muted px-4 text-sm text-faint transition-colors hover:border-navy-300 lg:flex"
      >
        <Search className="h-4 w-4" />
        Buscar chamados…
      </Link>

      <div className="flex items-center gap-1.5">
        <Link
          href="/base-conhecimento"
          title="Base de conhecimento"
          className="hidden h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-navy-700 sm:grid"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </Link>
        <Link
          href="/notificacoes"
          title="Notificações"
          className="relative grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-navy-700"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-semibold leading-none text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" />

        <Link
          href="/perfil"
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface-muted"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-navy-700 text-sm font-semibold text-white">
            {initials || <User className="h-4 w-4" />}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-tight text-foreground">
              {profile.full_name || "Sem nome"}
            </span>
            <span className="block text-xs text-muted">
              {ROLE_LABELS[profile.role]}
            </span>
          </span>
        </Link>

        <form action={signOutAction}>
          <button
            type="submit"
            title="Sair"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </form>
      </div>
    </header>
  );
}
