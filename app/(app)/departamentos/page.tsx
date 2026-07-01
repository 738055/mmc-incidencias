import type { Metadata } from "next";
import { Building, PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { StatusPill } from "@/components/admin/status-pill";
import { Th } from "@/components/admin/table";
import {
  createDepartmentAction,
  updateDepartmentAction,
  toggleDepartmentAction,
} from "@/app/(app)/admin/actions";
import { RestrictedNotice } from "@/components/layout/restricted";

export const metadata: Metadata = { title: "Departamentos" };

export default async function DepartmentsPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") return <RestrictedNotice />;

  const supabase = await createClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("*")
    .order("name");
  const total = departments?.length ?? 0;

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-navy-700">
          Administração
        </h1>
        <p className="mt-1 text-base text-muted">
          Gerencie sistemas, empresas parceiras, departamentos e usuários.
        </p>
      </div>

      <AdminTabs />

      <div>
        <div className="flex items-center gap-3 text-navy-700">
          <Building className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Departamentos</h2>
          <span className="font-label text-xs text-muted">({total})</span>
        </div>
        <p className="mt-2 text-sm text-muted">
          Setores internos. Vincule usuários (na aba Usuários) para medir demandas,
          bugs e melhorias por departamento.
        </p>
      </div>

      <details className="group overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
        <summary className="flex cursor-pointer items-center gap-2 px-6 py-4 text-sm font-semibold text-navy-700 marker:content-['']">
          <PlusCircle className="h-4 w-4 text-orange-700" /> Adicionar departamento
        </summary>
        <CardContent className="border-t border-border pt-5">
          <form
            action={createDepartmentAction}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="flex-1">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required placeholder="Ex.: Comercial, Operações, Financeiro" />
            </div>
            <Button type="submit" variant="accent">
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
                <Th>Departamento</Th>
                <Th>Status</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {departments && departments.length > 0 ? (
                departments.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-border transition-colors last:border-0 hover:bg-surface-muted/70"
                  >
                    <td className="px-6 py-4">
                      <form
                        action={updateDepartmentAction}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="id" value={d.id} />
                        <Input
                          name="name"
                          defaultValue={d.name}
                          required
                          className="max-w-xs"
                        />
                        <Button type="submit" variant="ghost" size="sm">
                          Salvar
                        </Button>
                      </form>
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill active={d.active} labels={["Ativo", "Inativo"]} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <form action={toggleDepartmentAction}>
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="active" value={String(d.active)} />
                        <Button type="submit" variant="ghost" size="sm">
                          {d.active ? "Desativar" : "Ativar"}
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-muted">
                    Nenhum departamento cadastrado.
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
