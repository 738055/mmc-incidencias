import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AssistantWidget } from "@/components/assistente/assistant-widget";
import { requireProfile } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const firstName = profile.full_name?.split(" ")[0] || undefined;

  return (
    <div className="flex min-h-screen">
      <Sidebar role={profile.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar profile={profile} />
        <main className="flex-1 px-5 py-6 lg:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
      <AssistantWidget firstName={firstName} />
    </div>
  );
}
