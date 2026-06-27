import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Web Push (server-only). Envia notificações do navegador para todos os
 * dispositivos registrados de um usuário, usando as chaves VAPID. Tolerante a
 * falhas: sem chaves configuradas, apenas registra e segue (mesmo padrão do
 * e-mail/IA). Assinaturas expiradas (404/410) são removidas.
 */

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:incidencias@mmcturismo.com.br";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body?: string;
  link?: string;
};

export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  if (!userId) return;
  if (!ensureConfigured()) {
    console.warn("[push] VAPID keys ausentes — push ignorado.");
    return;
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return;

  const json = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    link: payload.link ?? "/notificacoes",
  });

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          json,
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Assinatura morta — remove para não tentar de novo.
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          console.error("[push] envio:", err);
        }
      }
    }),
  );
}
