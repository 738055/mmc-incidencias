"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { isStaff } from "@/lib/domain";
import { tutorialSchema } from "@/lib/validations";
import { mediaKind } from "@/lib/media";

export type TutorialFormState = { error?: string };

type MediaInput = {
  path: string;
  name: string;
  mime: string;
  size: number;
  kind?: "image" | "video" | "file";
};

/** Cria um tutorial (somente equipe de TI) com mídia opcional. */
export async function createTutorialAction(
  _prev: TutorialFormState,
  formData: FormData,
): Promise<TutorialFormState> {
  const profile = await requireProfile();
  if (!isStaff(profile.role)) return { error: "Sem permissão." };

  const parsed = tutorialSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content") ?? "",
    systemId: formData.get("systemId") ?? "",
    category: formData.get("category") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();

  const { data: tutorial, error } = await supabase
    .from("tutorials")
    .insert({
      title: parsed.data.title,
      content: parsed.data.content || "",
      system_id: parsed.data.systemId || null,
      category: parsed.data.category || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !tutorial) {
    return { error: "Não foi possível criar o tutorial. Tente novamente." };
  }

  let media: MediaInput[] = [];
  try {
    const raw = formData.get("media");
    if (typeof raw === "string" && raw) media = JSON.parse(raw);
  } catch {
    media = [];
  }

  if (media.length > 0) {
    await supabase.from("tutorial_media").insert(
      media.map((m, i) => ({
        tutorial_id: tutorial.id,
        storage_path: m.path,
        file_name: m.name,
        mime_type: m.mime,
        size_bytes: m.size,
        kind: m.kind ?? mediaKind(m.mime),
        sort: i,
      })),
    );
  }

  revalidatePath("/tutoriais");
  redirect(`/tutoriais/${tutorial.id}`);
}

/** Exclui um tutorial (somente equipe). Remove os arquivos do Storage. */
export async function deleteTutorialAction(formData: FormData) {
  const profile = await requireProfile();
  if (!isStaff(profile.role)) return;
  const id = String(formData.get("id"));
  if (!id) return;

  const supabase = await createClient();

  // Remove os arquivos do Storage (best-effort) antes de apagar as linhas.
  const { data: media } = await supabase
    .from("tutorial_media")
    .select("storage_path")
    .eq("tutorial_id", id);
  if (media?.length) {
    await supabase.storage
      .from("attachments")
      .remove(media.map((m) => m.storage_path));
  }

  await supabase.from("tutorials").delete().eq("id", id);

  revalidatePath("/tutoriais");
  redirect("/tutoriais");
}
