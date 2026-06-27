"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

/** Dados de uma PushSubscription enviados pelo navegador. */
type SubInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Registra (ou atualiza) a assinatura de Web Push do dispositivo atual. */
export async function subscribePushAction(sub: SubInput): Promise<{ ok: boolean }> {
  const profile = await requireProfile();
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };

  const supabase = await createClient();
  // upsert por endpoint (único): reativar não duplica.
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: profile.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  return { ok: !error };
}

/** Remove a assinatura do dispositivo atual (ao desativar as notificações). */
export async function unsubscribePushAction(endpoint: string): Promise<{ ok: boolean }> {
  await requireProfile();
  if (!endpoint) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  return { ok: !error };
}
