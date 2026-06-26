"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  emailOnlySchema,
  newPasswordSchema,
} from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export type AuthState = { error?: string; notice?: string };

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { error: "E-mail ou senha incorretos." };
  }

  // Verifica status da conta antes de liberar.
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", data.user.id)
    .single();

  if (profile?.status === "disabled") {
    await supabase.auth.signOut();
    return { error: "Esta conta está desativada. Procure o administrador." };
  }

  // Registra o último acesso (best-effort).
  await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.user.id);

  const redirectTo = String(formData.get("redirect") || "/dashboard");
  revalidatePath("/", "layout");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const allowed = process.env.ALLOWED_EMAIL_DOMAIN?.toLowerCase().trim();
  const domain = parsed.data.email.split("@")[1]?.toLowerCase();
  if (allowed && domain !== allowed) {
    return { error: `Cadastro permitido apenas para e-mails @${allowed}.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });

  if (error) {
    const msg = /domínio|domain/i.test(error.message)
      ? error.message
      : "Não foi possível concluir o cadastro. Verifique os dados.";
    return { error: msg };
  }

  // Conta nasce PENDENTE (aguarda aprovação do admin). Encerra a sessão
  // eventualmente criada para não deixar o usuário "meio logado".
  await supabase.auth.signOut();

  return {
    notice:
      "Cadastro enviado! Sua conta ficará pendente até a aprovação de um administrador. Você poderá entrar assim que for liberada.",
  };
}

export async function forgotPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = emailOnlySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Informe um e-mail válido." };

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/callback?next=/redefinir-senha`,
  });

  await logAudit({
    action: "password.reset_request",
    targetEmail: parsed.data.email,
  });

  // Resposta neutra (não revela se o e-mail existe).
  return {
    notice:
      "Se houver uma conta com este e-mail, enviamos um link para redefinir a senha.",
  };
}

export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Senha inválida" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error:
        "Link inválido ou expirado. Solicite uma nova redefinição de senha.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { error: "Não foi possível redefinir a senha." };

  // Garante que não fique pendente de troca após redefinir.
  await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);
  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "password.change",
    targetId: user.id,
  });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function changePasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Senha inválida" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { error: "Não foi possível alterar a senha." };

  await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);
  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "password.change",
    targetId: user.id,
  });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
