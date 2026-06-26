import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { NewTicketForm } from "@/components/incidents/new-incident-form";

export const metadata: Metadata = { title: "Nova melhoria" };

export default async function NewImprovementPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: systems }, { data: companies }] = await Promise.all([
    supabase.from("systems").select("id, name").eq("active", true).order("name"),
    supabase.from("companies").select("id, name").eq("active", true).order("name"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/melhorias"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-navy-700"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-navy-700">
          Solicitar melhoria / desenvolvimento
        </h1>
        <p className="mt-1 text-base text-muted">
          Descreva a evolução desejada no sistema. A solicitação passa por
          análise e aprovação antes do desenvolvimento.
        </p>
      </div>

      <NewTicketForm
        kind="improvement"
        userId={profile.id}
        systems={systems ?? []}
        companies={companies ?? []}
      />
    </div>
  );
}
