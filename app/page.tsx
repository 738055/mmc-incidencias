import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Raiz da aplicação: sem página de apresentação. Vai direto para o login
 * (ou para o painel, se já houver sessão ativa).
 */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
