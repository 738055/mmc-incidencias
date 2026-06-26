import type { Metadata } from "next";
import { Server } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createSystemAction, toggleSystemAction } from "@/app/(app)/admin/actions";
import { RestrictedNotice } from "@/components/layout/restricted";

export const metadata: Metadata = { title: "Sistemas" };

export default async function SystemsPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") return <RestrictedNotice />;

  const supabase = await createClient();
  const { data: systems } = await supabase
    .from("systems")
    .select("*")
    .order("name");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-navy-700">
          <Server className="h-6 w-6" /> Sistemas
        </h1>
        <p className="text-sm text-muted">
          Catálogo de sistemas que podem ter incidências.
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <form action={createSystemAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required placeholder="Ex.: ERP / Backoffice" />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" name="description" placeholder="Opcional" />
            </div>
            <Button type="submit" variant="accent">
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        {systems && systems.length > 0 ? (
          systems.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 last:border-0"
            >
              <div>
                <p className="font-medium text-foreground">{s.name}</p>
                {s.description && (
                  <p className="text-xs text-muted">{s.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  className={
                    s.active
                      ? "bg-green-50 text-green-700 ring-green-200"
                      : "bg-gray-100 text-gray-500 ring-gray-200"
                  }
                >
                  {s.active ? "Ativo" : "Inativo"}
                </Badge>
                <form action={toggleSystemAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="active" value={String(s.active)} />
                  <Button type="submit" variant="ghost" size="sm">
                    {s.active ? "Desativar" : "Ativar"}
                  </Button>
                </form>
              </div>
            </div>
          ))
        ) : (
          <p className="px-5 py-10 text-center text-sm text-muted">
            Nenhum sistema cadastrado.
          </p>
        )}
      </Card>
    </div>
  );
}
