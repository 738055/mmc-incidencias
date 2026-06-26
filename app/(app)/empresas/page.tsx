import type { Metadata } from "next";
import { Building2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-navy-700">
          <Building2 className="h-6 w-6" /> Empresas parceiras
        </h1>
        <p className="text-sm text-muted">
          Fornecedores que atendem incidências. Recebem o chamado por e-mail
          quando direcionado a eles.
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <form action={createCompanyAction} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Nome da empresa</Label>
                <Input id="name" name="name" required placeholder="Ex.: Onasys" />
              </div>
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
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {companies?.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-navy-700">{c.name}</p>
                <Badge
                  className={`mt-1 ${
                    c.active
                      ? "bg-green-50 text-green-700 ring-green-200"
                      : "bg-gray-100 text-gray-500 ring-gray-200"
                  }`}
                >
                  {c.active ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              <form action={toggleCompanyAction}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="active" value={String(c.active)} />
                <Button type="submit" variant="ghost" size="sm">
                  {c.active ? "Desativar" : "Ativar"}
                </Button>
              </form>
            </div>
            <div className="mt-3 space-y-1">
              {c.contact_emails?.length ? (
                c.contact_emails.map((e) => (
                  <p key={e} className="flex items-center gap-1.5 text-xs text-muted">
                    <Mail className="h-3.5 w-3.5" /> {e}
                  </p>
                ))
              ) : (
                <p className="text-xs text-muted">Sem e-mails cadastrados.</p>
              )}
            </div>
          </Card>
        ))}
        {(!companies || companies.length === 0) && (
          <Card className="md:col-span-2 p-10 text-center text-sm text-muted">
            Nenhuma empresa cadastrada.
          </Card>
        )}
      </div>
    </div>
  );
}
