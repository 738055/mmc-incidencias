import { Resend } from "resend";
import {
  IncidentNotificationEmail,
  type IncidentEmailProps,
} from "./incident-notification";
import { WelcomeEmail, type WelcomeEmailProps } from "./welcome";
import { StatusUpdateEmail, type StatusEmailProps } from "./status-update";

type SendResult = { ok: boolean; skipped?: boolean; error?: string };

/**
 * Envia a notificação de incidência para os contatos de uma empresa parceira.
 * É tolerante a falhas: se a chave não estiver configurada, apenas registra e
 * segue (não quebra o fluxo de criação do chamado).
 */
export async function sendIncidentEmail(
  to: string[],
  props: IncidentEmailProps,
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from || to.length === 0) {
    console.warn("[email] RESEND_API_KEY/EMAIL_FROM ausente ou sem destinatários — e-mail ignorado.");
    return { ok: false, skipped: true };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `Nova ${props.kindLabel} #${props.ref}: ${props.title}`,
      react: IncidentNotificationEmail(props),
    });
    if (error) {
      console.error("[email] falha ao enviar:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] exceção ao enviar:", err);
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Notifica o solicitante (por e-mail) sobre uma novidade no chamado.
 * Tolerante a falhas: sem chave/destinatário, apenas registra e segue.
 */
export async function sendStatusEmail(
  to: string,
  props: StatusEmailProps,
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from || !to) {
    console.warn("[email] RESEND_API_KEY/EMAIL_FROM ausente — atualização ignorada.");
    return { ok: false, skipped: true };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: [to],
      subject: `${props.headline} — chamado #${props.ref}`,
      react: StatusUpdateEmail(props),
    });
    if (error) {
      console.error("[email] falha ao enviar atualização:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] exceção (atualização):", err);
    return { ok: false, error: (err as Error).message };
  }
}

/** Envia o e-mail de boas-vindas com a senha inicial. Tolerante a falhas. */
export async function sendWelcomeEmail(
  props: WelcomeEmailProps,
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn("[email] RESEND_API_KEY/EMAIL_FROM ausente — boas-vindas ignorado.");
    return { ok: false, skipped: true };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: [props.email],
      subject: "Seu acesso à plataforma MMC Incidências",
      react: WelcomeEmail(props),
    });
    if (error) {
      console.error("[email] falha ao enviar boas-vindas:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] exceção (boas-vindas):", err);
    return { ok: false, error: (err as Error).message };
  }
}

