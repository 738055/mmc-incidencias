"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { isStaff } from "@/lib/domain";
import { tutorialSchema } from "@/lib/validations";
import { mediaKind } from "@/lib/media";
import { embedText, transcribeAudio, TRANSCRIBE_MAX_BYTES } from "@/lib/ai";

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

  await embedTutorial(supabase, tutorial.id);

  revalidatePath("/tutoriais");
  redirect(`/tutoriais/${tutorial.id}`);
}

/**
 * (Re)gera o embedding semântico do tutorial a partir do texto (título, conteúdo,
 * categoria e transcrição). Gravado via service role. Best-effort.
 */
async function embedTutorial(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
) {
  try {
    const { data: t } = await supabase
      .from("tutorials")
      .select("title, content, category, transcript")
      .eq("id", id)
      .single();
    if (!t) return;
    const text = [t.title, t.category, t.content, t.transcript]
      .filter(Boolean)
      .join("\n\n");
    const embedding = await embedText(text);
    if (embedding) {
      await createAdminClient()
        .from("tutorials")
        .update({ embedding: `[${embedding.join(",")}]` })
        .eq("id", id);
    }
  } catch (err) {
    console.error("[tutorial] embed:", err);
  }
}

/**
 * Transcreve o áudio dos vídeos do tutorial (≤25 MB) via OpenAI e re-embeda,
 * para que a IA "entenda" o conteúdo do vídeo. Somente equipe. Best-effort.
 */
export async function transcribeTutorialAction(formData: FormData) {
  const profile = await requireProfile();
  if (!isStaff(profile.role)) return;
  const id = String(formData.get("id"));
  if (!id) return;

  const supabase = await createClient();
  const { data: media } = await supabase
    .from("tutorial_media")
    .select("storage_path, file_name, size_bytes")
    .eq("tutorial_id", id)
    .eq("kind", "video");

  const small = (media ?? []).filter((m) => m.size_bytes <= TRANSCRIBE_MAX_BYTES);
  const parts: string[] = [];
  for (const m of small) {
    const { data: signed } = await supabase.storage
      .from("attachments")
      .createSignedUrl(m.storage_path, 60 * 10);
    if (!signed?.signedUrl) continue;
    try {
      const resp = await fetch(signed.signedUrl);
      const blob = await resp.blob();
      const text = await transcribeAudio(blob, m.file_name);
      if (text) parts.push(text);
    } catch (err) {
      console.error("[tutorial] transcribe:", err);
    }
  }

  if (parts.length > 0) {
    await createAdminClient()
      .from("tutorials")
      .update({ transcript: parts.join("\n\n") })
      .eq("id", id);
  }

  await embedTutorial(supabase, id);
  revalidatePath(`/tutoriais/${id}`);
}

/** Edita um tutorial (somente equipe). Permite acrescentar nova mídia. */
export async function editTutorialAction(
  _prev: TutorialFormState,
  formData: FormData,
): Promise<TutorialFormState> {
  const profile = await requireProfile();
  if (!isStaff(profile.role)) return { error: "Sem permissão." };

  const id = String(formData.get("id"));
  if (!id) return { error: "Tutorial inválido." };

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
  const { error } = await supabase
    .from("tutorials")
    .update({
      title: parsed.data.title,
      content: parsed.data.content || "",
      system_id: parsed.data.systemId || null,
      category: parsed.data.category || null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar as alterações." };

  let media: MediaInput[] = [];
  try {
    const raw = formData.get("media");
    if (typeof raw === "string" && raw) media = JSON.parse(raw);
  } catch {
    media = [];
  }

  if (media.length > 0) {
    const { count } = await supabase
      .from("tutorial_media")
      .select("*", { count: "exact", head: true })
      .eq("tutorial_id", id);
    const base = count ?? 0;
    await supabase.from("tutorial_media").insert(
      media.map((m, i) => ({
        tutorial_id: id,
        storage_path: m.path,
        file_name: m.name,
        mime_type: m.mime,
        size_bytes: m.size,
        kind: m.kind ?? mediaKind(m.mime),
        sort: base + i,
      })),
    );
  }

  await embedTutorial(supabase, id);

  revalidatePath("/tutoriais");
  revalidatePath(`/tutoriais/${id}`);
  redirect(`/tutoriais/${id}`);
}

/** Remove um único arquivo de mídia de um tutorial (somente equipe). */
export async function deleteTutorialMediaAction(formData: FormData) {
  const profile = await requireProfile();
  if (!isStaff(profile.role)) return;
  const mediaId = String(formData.get("mediaId"));
  const tutorialId = String(formData.get("tutorialId"));
  if (!mediaId) return;

  const supabase = await createClient();
  const { data: m } = await supabase
    .from("tutorial_media")
    .select("storage_path")
    .eq("id", mediaId)
    .single();
  if (m?.storage_path) {
    await supabase.storage.from("attachments").remove([m.storage_path]);
  }
  await supabase.from("tutorial_media").delete().eq("id", mediaId);

  revalidatePath(`/tutoriais/${tutorialId}/editar`);
  revalidatePath(`/tutoriais/${tutorialId}`);
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
