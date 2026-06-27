"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/supabase/types";

/**
 * Sininho com badge ao vivo. O total não-lido vem do servidor (prop) e é
 * mantido autoritativo via `router.refresh()` — quando chega uma nova
 * notificação pelo Supabase Realtime, mostramos um toast e revalidamos, e o
 * badge reflete o novo total sem refresh manual.
 */
export function NotificationBell({
  userId,
  initialUnread,
}: {
  userId: string;
  initialUnread: number;
}) {
  const [toast, setToast] = useState<{ title: string; body: string | null; link: string | null } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("notifications-bell")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          setToast({ title: n.title, body: n.body, link: n.link });
          router.refresh(); // atualiza o badge (contagem server-side) e as listas
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  // Esconde o toast após alguns segundos.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <>
      <Link
        href="/notificacoes"
        title="Notificações"
        className="relative grid h-10 w-10 place-items-center rounded-full text-foreground transition-colors hover:bg-surface-muted"
      >
        <Bell className="h-5 w-5" />
        {initialUnread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-background bg-status-critical px-1 text-[10px] font-bold leading-none text-white">
            {initialUnread > 9 ? "9+" : initialUnread}
          </span>
        )}
      </Link>

      {toast && (
        <Link
          href={toast.link ?? "/notificacoes"}
          onClick={() => setToast(null)}
          className="fixed right-4 top-20 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-4 shadow-[0_18px_45px_rgba(0,23,54,0.22)] transition-transform hover:-translate-y-0.5 sm:right-6"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-500/10 text-orange-600">
              <Bell className="h-4 w-4" />
            </span>
            {toast.title}
          </p>
          {toast.body && <p className="mt-1 line-clamp-2 text-sm text-muted">{toast.body}</p>}
        </Link>
      )}
    </>
  );
}
