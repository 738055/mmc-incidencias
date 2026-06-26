import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { AssistantChat } from "@/components/assistente/chat";

export const metadata: Metadata = { title: "Assistente" };

export default async function AssistantPage() {
  const profile = await requireProfile();
  const firstName = profile.full_name?.split(" ")[0] || undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-navy-700">
          Assistente
        </h1>
        <p className="mt-1 text-base text-muted">
          Converse com o Bugzito sobre como usar os sistemas. Ele busca nos
          tutoriais e nas soluções já registradas.
        </p>
      </div>
      <div className="h-[calc(100vh-13rem)] overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
        <AssistantChat firstName={firstName} />
      </div>
    </div>
  );
}
