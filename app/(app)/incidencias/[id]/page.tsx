import type { Metadata } from "next";
import { TicketDetail } from "@/components/incidents/ticket-detail";

export const metadata: Metadata = { title: "Chamado" };

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <TicketDetail
      id={id}
      expectedKind="incident"
      backHref="/incidencias"
      backLabel="Voltar para incidências"
    />
  );
}
