"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Mantém o detalhe do chamado atualizado ao vivo: assina (Supabase Realtime)
 * mudanças daquele `incident` (status/atribuição/resolução) e novos comentários,
 * e dá `router.refresh()` — o conteúdo exibido continua vindo do servidor
 * (RLS-protegido); o evento só dispara o re-fetch. Sem render próprio.
 */
export function TicketLive({ incidentId }: { incidentId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`ticket-${incidentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "incidents",
          filter: `id=eq.${incidentId}`,
        },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "incident_comments",
          filter: `incident_id=eq.${incidentId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incidentId, router]);

  return null;
}
