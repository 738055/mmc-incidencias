import Link from "next/link";
import { LogOut, User, Search, HelpCircle, Settings } from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS } from "@/lib/domain";
import type { Profile } from "@/lib/supabase/types";
import { MobileNav } from "./mobile-nav";
import { NotificationBell } from "./notification-bell";

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
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-border-strong/50 bg-background/95 px-5 backdrop-blur lg:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <MobileNav role={profile.role} />

        <Link
          href="/incidencias/nova"
          className="font-label inline-flex h-10 items-center rounded-lg bg-orange-700 px-3 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 lg:hidden"
        >
          + Novo chamado
        </Link>

        <Link
          href="/incidencias"
          className="hidden h-12 w-[min(28rem,42vw)] items-center gap-3 rounded-lg border border-border bg-surface-muted px-4 text-sm text-muted shadow-sm transition-colors hover:border-navy-300 hover:bg-surface md:flex"
        >
          <Search className="h-5 w-5 shrink-0 text-faint" />
          <span className="truncate">Buscar chamados, soluções...</span>
        </Link>
      </div>

      <div className="flex items-center gap-1.5">
        <Link
          href="/base-conhecimento"
          title="Base de conhecimento"
          className="hidden h-10 w-10 place-items-center rounded-full text-foreground transition-colors hover:bg-surface-muted sm:grid"
        >
          <HelpCircle className="h-5 w-5" />
        </Link>
        {profile.role === "admin" && (
          <Link
            href="/admin"
            title="Administração"
            className="hidden h-10 w-10 place-items-center rounded-full text-foreground transition-colors hover:bg-surface-muted sm:grid"
          >
            <Settings className="h-5 w-5" />
          </Link>
        )}
        <NotificationBell userId={profile.id} initialUnread={unread} />

        <Link
          href="/perfil"
          className="ml-1 flex items-center gap-2.5 rounded-full px-1.5 py-1 transition-colors hover:bg-surface-muted"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-navy-700 text-sm font-bold text-white shadow-sm ring-2 ring-white">
            {initials || <User className="h-4 w-4" />}
          </span>
          <span className="hidden min-w-0 text-left xl:block">
            <span className="block max-w-40 truncate text-sm font-semibold leading-tight text-foreground">
              {profile.full_name || "Sem nome"}
            </span>
            <span className="font-label block text-[10px] text-muted">
              {ROLE_LABELS[profile.role]}
            </span>
          </span>
        </Link>

        <form action={signOutAction}>
          <button
            type="submit"
            title="Sair"
            className="grid h-10 w-10 place-items-center rounded-full text-muted transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </form>
      </div>
    </header>
  );
}
