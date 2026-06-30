import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { RestrictedNotice } from "@/components/layout/restricted";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { updateSystemAction } from "@/app/(app)/admin/actions";

export const metadata: Metadata = { title: "Editar sistema" };

export default async function EditSystemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  if (profile.role !== "admin") return <RestrictedNotice />;

  const supabase = await createClient();
  const [{ data: system }, { data: companies }] = await Promise.all([
    supabase.from("systems").select("*").eq("id", id).single(),
    supabase.from("companies").select("id, name").eq("active", true).order("name"),
  ]);
  if (!system) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/sistemas"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-navy-700"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos sistemas
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-navy-700">Editar sistema</h1>
        <p className="text-sm text-muted">{system.name}</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <form
            action={updateSystemAction}
            className="grid gap-4 sm:grid-cols-2 sm:items-end"
          >
            <input type="hidden" name="id" value={system.id} />
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required defaultValue={system.name} />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                name="description"
                defaultValue={system.description ?? ""}
                placeholder="Opcional"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="developerEmails">E-mails dos desenvolvedores</Label>
              <Textarea
                id="developerEmails"
                name="developerEmails"
                rows={2}
                defaultValue={system.developer_emails?.join(", ") ?? ""}
                placeholder="dev1@empresa.com, dev2@empresa.com"
              />
              <p className="mt-1 text-xs text-muted">
                Todos recebem os chamados deste sistema por e-mail. Separe por
                vírgula ou quebra de linha.
              </p>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="companyId">Empresa responsável</Label>
              <Select
                id="companyId"
                name="companyId"
                defaultValue={system.company_id ?? ""}
              >
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
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" variant="accent">
                Salvar
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href="/sistemas">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
