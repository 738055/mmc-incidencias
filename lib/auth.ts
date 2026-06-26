import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

/**
 * Carrega o usuário autenticado e seu perfil, aplicando o controle de acesso:
 *  - sem sessão            -> /login
 *  - conta desativada      -> logout + /login?status=disabled
 *  - conta pendente        -> /pendente (aguardando aprovação)
 *  - troca de senha exigida -> /trocar-senha
 * Use nas páginas/layout protegidos (Server Components).
 */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  const p = profile as Profile;

  if (p.status === "disabled") {
    await supabase.auth.signOut();
    redirect("/login?status=disabled");
  }
  if (p.status === "pending") {
    redirect("/pendente");
  }
  if (p.must_change_password) {
    redirect("/trocar-senha");
  }

  return p;
}

/** Variante que não redireciona por must_change/pending — usada nas telas de
 *  transição (/trocar-senha, /pendente) para evitar loop de redirecionamento. */
export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return (data as Profile) ?? null;
}
