import Link from "next/link";
import type { Metadata } from "next";
import {
  Bell,
  RefreshCw,
  MessageSquare,
  UserCheck,
  CheckCircle2,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/utils";
import type { Notification, NotificationType } from "@/lib/supabase/types";
import { markAllReadAction, markReadAction } from "./actions";

export const metadata: Metadata = { title: "Notificações" };

const ICONS: Record<NotificationType, typeof Bell> = {
  status_change: RefreshCw,
  comment: MessageSquare,
  assigned: UserCheck,
  resolved: CheckCircle2,
};

export default async function NotificationsPage() {
  await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as Notification[];
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-navy-700">
            Notificações
          </h1>
          <p className="mt-1 text-sm text-muted">
            {unread > 0
              ? `Você tem ${unread} não lida${unread > 1 ? "s" : ""}.`
              : "Tudo em dia — nenhuma não lida."}
          </p>
        </div>
        {unread > 0 && (
          <form action={markAllReadAction}>
            <Button type="submit" variant="outline" size="sm">
              <Check className="h-4 w-4" /> Marcar todas como lidas
            </Button>
          </form>
        )}
      </div>

      <Card>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-muted text-faint">
              <Bell className="h-6 w-6" />
            </span>
            <p className="text-sm text-muted">Nenhuma notificação ainda.</p>
          </div>
        ) : (
          <ul>
            {notifications.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              const Inner = (
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                      n.read
                        ? "bg-surface-muted text-faint"
                        : "bg-orange-500/10 text-orange-600"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      {!n.read && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                      )}
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 text-sm text-muted">{n.body}</p>
                    )}
                    <p className="mt-1 font-label text-[11px] uppercase tracking-wider text-faint">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </div>
              );

              return (
                <li
                  key={n.id}
                  className={`flex items-center gap-2 border-b border-border px-5 py-4 last:border-0 ${
                    n.read ? "" : "bg-orange-500/[0.03]"
                  }`}
                >
                  {n.link ? (
                    <Link href={n.link} className="min-w-0 flex-1">
                      {Inner}
                    </Link>
                  ) : (
                    <div className="min-w-0 flex-1">{Inner}</div>
                  )}
                  {!n.read && (
                    <form action={markReadAction}>
                      <input type="hidden" name="id" value={n.id} />
                      <button
                        type="submit"
                        title="Marcar como lida"
                        className="grid h-8 w-8 place-items-center rounded-lg text-faint transition-colors hover:bg-surface-muted hover:text-navy-700"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
