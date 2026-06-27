import { createAdminClient } from "@/lib/supabase/server";
import { sendStatusEmail } from "@/lib/email/send";
import { sendPush } from "@/lib/push";
import type { NotificationType } from "@/lib/supabase/types";

/**
 * Notificações in-app (e e-mail best-effort). A inserção usa o service role
 * (ignora RLS) porque a equipe notifica o solicitante — um usuário diferente.
 * SOMENTE no servidor. Tolerante a falhas: nunca quebra o fluxo do chamado.
 */

type NotifyInput = {
  userId: string;
  incidentId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  /** Se informado, também dispara e-mail para o solicitante. */
  email?: {
    to: string;
    ref: number;
    incidentTitle: string;
    actorName: string;
  };
};

export async function notify(input: NotifyInput): Promise<void> {
  if (!input.userId) return;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[notify] SUPABASE_SERVICE_ROLE_KEY ausente — notificação ignorada.");
    return;
  }

  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      user_id: input.userId,
      incident_id: input.incidentId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    });
  } catch (err) {
    console.error("[notify] insert:", err);
  }

  // Web Push (independente do in-app e do e-mail; best-effort).
  try {
    await sendPush(input.userId, {
      title: input.title,
      body: input.body,
      link: input.link,
    });
  } catch (err) {
    console.error("[notify] push:", err);
  }

  // E-mail é independente do in-app: uma falha não afeta a outra.
  if (input.email) {
    try {
      const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
      await sendStatusEmail(input.email.to, {
        ref: input.email.ref,
        title: input.email.incidentTitle,
        headline: input.title,
        message: input.body ?? input.title,
        actorName: input.email.actorName,
        url: `${base}${input.link ?? ""}`,
      });
    } catch (err) {
      console.error("[notify] email:", err);
    }
  }
}
