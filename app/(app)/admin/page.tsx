import Link from "next/link";
import type { Metadata } from "next";
import { Users, Clock, ScrollText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import {
  ROLE_LABELS,
  USER_STATUS_LABELS,
  USER_STATUS_TONE,
} from "@/lib/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateUserForm } from "@/components/admin/create-user-form";
import {
  setRoleAction,
  approveUserAction,
  setStatusAction,
} from "@/app/(app)/admin/actions";
import { RestrictedNotice } from "@/components/layout/restricted";
import { formatDateTime } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Usuários" };

export default async function AdminUsersPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") return <RestrictedNotice />;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  const users = (data as Profile[]) ?? [];
  const pending = users.filter((u) => u.status === "pending");
  const active = users.filter((u) => u.status !== "pending");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-navy-700">
            <Users className="h-6 w-6" /> Usuários
          </h1>
          <p className="text-sm text-muted">
            Crie contas, aprove cadastros e gerencie papéis e acessos.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/auditoria">
            <ScrollText className="h-4 w-4" /> Auditoria
          </Link>
        </Button>
      </div>

      {/* Criar usuário */}
      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Adicionar usuário
          </h2>
          <CreateUserForm />
        </CardContent>
      </Card>

      {/* Aprovações pendentes */}
      {pending.length > 0 && (
        <Card className="border-amber-200">
          <CardContent className="pt-5">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-amber-700">
              <Clock className="h-4 w-4" /> Aguardando aprovação ({pending.length})
            </h2>
            <div className="space-y-3">
              {pending.map((u) => (
                <form
                  key={u.id}
                  action={approveUserAction}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50/60 px-4 py-3"
                >
                  <input type="hidden" name="id" value={u.id} />
                  <div>
                    <p className="font-medium text-foreground">
                      {u.full_name || "Sem nome"}
                    </p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      name="role"
                      defaultValue="requester"
                      className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"
                    >
                      {(["requester", "technician", "admin"] as const).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="accent">
                      Aprovar
                    </Button>
                  </div>
                </form>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usuários ativos/desativados */}
      <Card>
        {active.map((u) => (
          <div
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 last:border-0"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-navy-100 text-sm font-semibold text-navy-700">
                {(u.full_name || u.email).slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="font-medium text-foreground">
                  {u.full_name || "Sem nome"}
                  {u.id === profile.id && (
                    <span className="ml-2 text-xs text-muted">(você)</span>
                  )}
                </p>
                <p className="text-xs text-muted">{u.email}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  Último acesso: {formatDateTime(u.last_login_at)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className={USER_STATUS_TONE[u.status]}>
                {USER_STATUS_LABELS[u.status]}
              </Badge>

              <form action={setRoleAction} className="flex items-center gap-1.5">
                <input type="hidden" name="id" value={u.id} />
                <select
                  name="role"
                  defaultValue={u.role}
                  disabled={u.id === profile.id}
                  className="h-9 rounded-lg border border-border bg-surface px-3 text-sm disabled:opacity-50"
                >
                  {(["requester", "technician", "admin"] as const).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={u.id === profile.id}
                >
                  Salvar
                </Button>
              </form>

              {u.id !== profile.id && (
                <form action={setStatusAction}>
                  <input type="hidden" name="id" value={u.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={u.status === "disabled" ? "active" : "disabled"}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant={u.status === "disabled" ? "outline" : "danger"}
                  >
                    {u.status === "disabled" ? "Reativar" : "Desativar"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
