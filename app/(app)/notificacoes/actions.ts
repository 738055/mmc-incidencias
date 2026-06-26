"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

/** Marca todas as notificações do usuário como lidas. */
export async function markAllReadAction() {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", profile.id)
    .eq("read", false);
  revalidatePath("/notificacoes");
}

/** Marca uma notificação específica como lida. */
export async function markReadAction(formData: FormData) {
  const profile = await requireProfile();
  const id = String(formData.get("id"));
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", profile.id);
  revalidatePath("/notificacoes");
}
