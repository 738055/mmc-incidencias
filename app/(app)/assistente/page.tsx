import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { AssistantChat } from "@/components/assistente/chat";

export const metadata: Metadata = { title: "Assistente" };

export default async function AssistantPage() {
  const profile = await requireProfile();
  const firstName = profile.full_name?.split(" ")[0] || undefined;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-navy-700">Assistente</h1>
        <p className="text-sm text-muted">
          Converse com o Bugzito sobre como usar os sistemas. Ele busca nos
          tutoriais e nas soluções já registradas.
        </p>
      </div>
      <div className="h-[calc(100vh-12rem)] overflow-hidden rounded-xl border border-border shadow-[var(--shadow-card)]">
        <AssistantChat firstName={firstName} />
      </div>
    </div>
  );
}
