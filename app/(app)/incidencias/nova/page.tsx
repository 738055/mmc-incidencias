import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { NewTicketForm } from "@/components/incidents/new-incident-form";

export const metadata: Metadata = { title: "Novo chamado" };

export default async function NewIncidentPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: systems }, { data: companies }] = await Promise.all([
    supabase.from("systems").select("id, name").eq("active", true).order("name"),
    supabase.from("companies").select("id, name").eq("active", true).order("name"),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/incidencias"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-navy-700"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-navy-700">Abrir chamado</h1>
        <p className="text-sm text-muted">
          Descreva o problema. A IA buscará soluções de chamados parecidos e
          poderá analisar imagens anexadas.
        </p>
      </div>

      <NewTicketForm
        kind="incident"
        userId={profile.id}
        systems={systems ?? []}
        companies={companies ?? []}
      />
    </div>
  );
}
