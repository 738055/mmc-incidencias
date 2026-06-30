import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { RestrictedNotice } from "@/components/layout/restricted";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { updateCompanyAction } from "@/app/(app)/admin/actions";

export const metadata: Metadata = { title: "Editar empresa" };

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  if (profile.role !== "admin") return <RestrictedNotice />;

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();
  if (!company) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/empresas"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-navy-700"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar às empresas
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-navy-700">Editar empresa</h1>
        <p className="text-sm text-muted">{company.name}</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <form action={updateCompanyAction} className="space-y-4">
            <input type="hidden" name="id" value={company.id} />
            <div>
              <Label htmlFor="name">Nome da empresa</Label>
              <Input id="name" name="name" required defaultValue={company.name} />
            </div>
            <div>
              <Label htmlFor="contactEmails">E-mails de contato</Label>
              <Textarea
                id="contactEmails"
                name="contactEmails"
                rows={2}
                defaultValue={company.contact_emails?.join(", ") ?? ""}
                placeholder="suporte@onasys.com.br, ti@onasys.com.br"
              />
              <p className="mt-1 text-xs text-muted">
                Separe por vírgula ou quebra de linha.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="accent">
                Salvar
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href="/empresas">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
