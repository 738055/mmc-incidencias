import type { Metadata } from "next";
import { TicketDetail } from "@/components/incidents/ticket-detail";

export const metadata: Metadata = { title: "Melhoria" };

export default async function ImprovementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <TicketDetail
      id={id}
      expectedKind="improvement"
      backHref="/melhorias"
      backLabel="Voltar para melhorias"
    />
  );
}
