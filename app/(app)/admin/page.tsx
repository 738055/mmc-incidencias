import Link from "next/link";
import type { Metadata } from "next";
import { Users, Clock, ScrollText, UserPlus, Sparkles } from "lucide-react";
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
import { AdminTabs } from "@/components/admin/admin-tabs";
import { Th } from "@/components/admin/table";
import { CreateUserForm } from "@/components/admin/create-user-form";
import {
  setRoleAction,
  approveUserAction,
  setStatusAction,
  backfillEmbeddingsAction,
} from "@/app/(app)/admin/actions";
import { DepartmentSelect } from "@/components/admin/department-select";
import { RestrictedNotice } from "@/components/layout/restricted";
import { formatDateTime } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Usuários" };

export default async function AdminUsersPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") return <RestrictedNotice />;

  const supabase = await createClient();
  const [{ data }, { data: companyRows }, { data: departmentRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true }),
      supabase.from("companies").select("id, name").eq("active", true).order("name"),
      supabase
        .from("departments")
        .select("id, name")
        .eq("active", true)
        .order("name"),
    ]);

  const users = (data as Profile[]) ?? [];
  const companies = companyRows ?? [];
  const departments = departmentRows ?? [];
  const pending = users.filter((u) => u.status === "pending");
  const active = users.filter((u) => u.status !== "pending");

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-navy-700">
            Administração
          </h1>
          <p className="mt-1 text-base text-muted">
            Gerencie sistemas, empresas parceiras e usuários.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={backfillEmbeddingsAction}>
            <Button type="submit" variant="outline" size="sm" title="Gera os embeddings que faltam em chamados concluídos e tutoriais publicados">
              <Sparkles className="h-4 w-4" /> Reprocessar IA
            </Button>
          </form>
          <Button asChild variant="outline" size="sm">
            <Link href="/auditoria">
              <ScrollText className="h-4 w-4" /> Auditoria
            </Link>
          </Button>
        </div>
      </div>

      <AdminTabs />

      <div className="flex items-center gap-3 text-navy-700">
        <Users className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Usuários</h2>
        <span className="font-label text-xs text-muted">({active.length})</span>
      </div>

      <details className="group overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
        <summary className="flex cursor-pointer items-center gap-2 px-6 py-4 text-sm font-semibold text-navy-700 marker:content-['']">
          <UserPlus className="h-4 w-4 text-orange-700" /> Adicionar usuário
        </summary>
        <CardContent className="border-t border-border pt-5">
          <CreateUserForm companies={companies} />
        </CardContent>
      </details>

      {pending.length > 0 && (
        <Card className="border-amber-200">
          <CardContent className="pt-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-700">
              <Clock className="h-4 w-4" /> Aguardando aprovação ({pending.length})
            </h2>
            <div className="space-y-3">
              {pending.map((u) => (
                <form
                  key={u.id}
                  action={approveUserAction}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3"
                >
                  <input type="hidden" name="id" value={u.id} />
                  <div>
                    <p className="font-semibold text-foreground">
                      {u.full_name || "Sem nome"}
                    </p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      name="role"
                      defaultValue="requester"
                      className="h-10 rounded-lg border border-border bg-surface px-3 text-sm shadow-sm"
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

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <Th>Usuário</Th>
                <Th>Papel</Th>
                <Th>Departamento</Th>
                <Th>Status</Th>
                <Th>Último acesso</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {active.map((u) => {
                const self = u.id === profile.id;
                return (
                  <tr
                    key={u.id}
                    className="border-b border-border align-middle transition-colors last:border-0 hover:bg-surface-muted/70"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy-700 text-xs font-bold text-white">
                          {(u.full_name || u.email).slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {u.full_name || "Sem nome"}
                            {self && (
                              <span className="ml-2 text-xs text-muted">(você)</span>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <form action={setRoleAction} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={u.id} />
                        <select
                          name="role"
                          defaultValue={u.role}
                          disabled={self}
                          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm shadow-sm disabled:opacity-50"
                        >
                          {(["requester", "technician", "admin", "partner"] as const).map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" size="sm" variant="outline" disabled={self}>
                          Salvar
                        </Button>
                      </form>
                    </td>
                    <td className="px-6 py-5">
                      <DepartmentSelect
                        userId={u.id}
                        current={u.department_id}
                        departments={departments}
                      />
                    </td>
                    <td className="px-6 py-5">
                      <Badge className={USER_STATUS_TONE[u.status]}>
                        {USER_STATUS_LABELS[u.status]}
                      </Badge>
                    </td>
                    <td className="px-6 py-5 text-muted">
                      {formatDateTime(u.last_login_at)}
                    </td>
                    <td className="px-6 py-5 text-right">
                      {!self && (
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
