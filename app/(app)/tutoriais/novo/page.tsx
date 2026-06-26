import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { isStaff } from "@/lib/domain";
import { TutorialForm } from "@/components/tutorials/tutorial-form";

export const metadata: Metadata = { title: "Novo tutorial" };

export default async function NewTutorialPage() {
  const profile = await requireProfile();
  if (!isStaff(profile.role)) redirect("/tutoriais");

  const supabase = await createClient();
  const { data: systems } = await supabase
    .from("systems")
    .select("id, name")
    .eq("active", true)
    .order("name");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/tutoriais"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-navy-700"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-navy-700">Novo tutorial</h1>
        <p className="text-sm text-muted">
          Documente a solução de um problema frequente — com passo a passo e
          vídeo. Fica visível para toda a equipe e solicitantes.
        </p>
      </div>

      <TutorialForm userId={profile.id} systems={systems ?? []} />
    </div>
  );
}
