import type { Metadata } from "next";
import { Server, PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { StatusPill } from "@/components/admin/status-pill";
import { Th } from "@/components/admin/table";
import { createSystemAction, toggleSystemAction } from "@/app/(app)/admin/actions";
import { RestrictedNotice } from "@/components/layout/restricted";

export const metadata: Metadata = { title: "Sistemas" };

export default async function SystemsPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") return <RestrictedNotice />;

  const supabase = await createClient();
  const [{ data: systems }, { data: companies }] = await Promise.all([
    supabase.from("systems").select("*").order("name"),
    supabase.from("companies").select("id, name").eq("active", true).order("name"),
  ]);
  const total = systems?.length ?? 0;
  const companyName = new Map((companies ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-navy-700">
          Administração
        </h1>
        <p className="mt-1 text-base text-muted">
          Gerencie sistemas, empresas parceiras e usuários.
        </p>
      </div>

      <AdminTabs />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-navy-700">
          <Server className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Sistemas internos</h2>
          <span className="font-label text-xs text-muted">({total})</span>
        </div>
      </div>

      <details className="group overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
        <summary className="flex cursor-pointer items-center gap-2 px-6 py-4 text-sm font-semibold text-navy-700 marker:content-['']">
          <PlusCircle className="h-4 w-4 text-orange-700" /> Adicionar sistema
        </summary>
        <CardContent className="border-t border-border pt-5">
          <form
            action={createSystemAction}
            className="grid gap-4 sm:grid-cols-2 sm:items-end"
          >
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required placeholder="Ex.: ERP / Backoffice" />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" name="description" placeholder="Opcional" />
            </div>
            <div>
              <Label htmlFor="developerName">Desenvolvedor (nome)</Label>
              <Input id="developerName" name="developerName" placeholder="Opcional" />
            </div>
            <div>
              <Label htmlFor="developerEmail">E-mail do desenvolvedor</Label>
              <Input
                id="developerEmail"
                name="developerEmail"
                type="email"
                placeholder="dev@empresa.com"
              />
              <p className="mt-1 text-xs text-muted">
                Recebe os chamados deste sistema por e-mail.
              </p>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="companyId">Empresa responsável</Label>
              <Select id="companyId" name="companyId" defaultValue="">
                <option value="">Nenhuma</option>
                {(companies ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-muted">
                Sugerida automaticamente ao abrir chamado/melhoria deste sistema.
              </p>
            </div>
            <Button type="submit" variant="accent" className="sm:col-span-2 sm:justify-self-start">
              Adicionar
            </Button>
          </form>
        </CardContent>
      </details>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <Th>Sistema</Th>
                <Th>Empresa</Th>
                <Th>Desenvolvedor</Th>
                <Th>Status</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {systems && systems.length > 0 ? (
                systems.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border transition-colors last:border-0 hover:bg-surface-muted/70"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3 font-semibold text-navy-700">
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-navy-100 text-navy-700">
                          <Server className="h-5 w-5" />
                        </span>
                        {s.name}
                      </div>
                    </td>
                    <td className="max-w-xs truncate px-6 py-5 text-muted">
                      {(s.company_id && companyName.get(s.company_id)) || "—"}
                    </td>
                    <td className="px-6 py-5 text-muted">
                      {s.developer_email ? (
                        <span className="block truncate">
                          {s.developer_name && (
                            <span className="text-foreground">{s.developer_name}</span>
                          )}
                          <span className="block text-xs">{s.developer_email}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <StatusPill active={s.active} />
                    </td>
                    <td className="px-6 py-5 text-right">
                      <form action={toggleSystemAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="active" value={String(s.active)} />
                        <Button type="submit" variant="ghost" size="sm">
                          {s.active ? "Desativar" : "Ativar"}
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted">
                    Nenhum sistema cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
