import type { Metadata } from "next";
import Link from "next/link";
import { Building2, PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { StatusPill } from "@/components/admin/status-pill";
import { Th } from "@/components/admin/table";
import {
  createCompanyAction,
  toggleCompanyAction,
} from "@/app/(app)/admin/actions";
import { RestrictedNotice } from "@/components/layout/restricted";

export const metadata: Metadata = { title: "Empresas parceiras" };

export default async function CompaniesPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") return <RestrictedNotice />;

  const supabase = await createClient();
  const { data: companies } = await supabase
    .from("companies")
    .select("*")
    .order("name");
  const total = companies?.length ?? 0;

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

      <div>
        <div className="flex items-center gap-3 text-navy-700">
          <Building2 className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Empresas parceiras</h2>
          <span className="font-label text-xs text-muted">({total})</span>
        </div>
        <p className="mt-2 text-sm text-muted">
          Fornecedores que atendem incidências. Recebem o chamado por e-mail quando
          direcionado a eles.
        </p>
      </div>

      <details className="group overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
        <summary className="flex cursor-pointer items-center gap-2 px-6 py-4 text-sm font-semibold text-navy-700 marker:content-['']">
          <PlusCircle className="h-4 w-4 text-orange-700" /> Adicionar empresa
        </summary>
        <CardContent className="border-t border-border pt-5">
          <form action={createCompanyAction} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da empresa</Label>
              <Input id="name" name="name" required placeholder="Ex.: Onasys" />
            </div>
            <div>
              <Label htmlFor="contactEmails">E-mails de contato</Label>
              <Textarea
                id="contactEmails"
                name="contactEmails"
                rows={2}
                placeholder="suporte@onasys.com.br, ti@onasys.com.br"
              />
              <p className="mt-1 text-xs text-muted">
                Separe por vírgula ou quebra de linha.
              </p>
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="accent">
                Adicionar empresa
              </Button>
            </div>
          </form>
        </CardContent>
      </details>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <Th>Empresa</Th>
                <Th>E-mails de contato</Th>
                <Th>Status</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {companies && companies.length > 0 ? (
                companies.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border transition-colors last:border-0 hover:bg-surface-muted/70"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3 font-semibold text-navy-700">
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-navy-100 text-navy-700">
                          <Building2 className="h-5 w-5" />
                        </span>
                        {c.name}
                      </div>
                    </td>
                    <td className="max-w-xs px-6 py-5 text-muted">
                      {c.contact_emails?.length ? (
                        <span className="line-clamp-2 break-words">
                          {c.contact_emails.join(", ")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <StatusPill active={c.active} labels={["Ativa", "Inativa"]} />
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/empresas/${c.id}/editar`}>Editar</Link>
                        </Button>
                        <form action={toggleCompanyAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="active" value={String(c.active)} />
                          <Button type="submit" variant="ghost" size="sm">
                            {c.active ? "Desativar" : "Ativar"}
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted">
                    Nenhuma empresa cadastrada.
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
