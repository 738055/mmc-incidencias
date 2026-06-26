import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Film, ImageIcon, FileText, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { isStaff } from "@/lib/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { TutorialForm } from "@/components/tutorials/tutorial-form";
import { humanSize, isImage, isVideo } from "@/lib/media";
import { deleteTutorialMediaAction } from "../../actions";

export const metadata: Metadata = { title: "Editar tutorial" };

export default async function EditTutorialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  if (!isStaff(profile.role)) redirect("/tutoriais");

  const supabase = await createClient();

  const [{ data: tutorial }, { data: systems }, { data: media }] =
    await Promise.all([
      supabase.from("tutorials").select("*").eq("id", id).single(),
      supabase.from("systems").select("id, name").eq("active", true).order("name"),
      supabase
        .from("tutorial_media")
        .select("*")
        .eq("tutorial_id", id)
        .order("sort"),
    ]);

  if (!tutorial) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href={`/tutoriais/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-navy-700"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao tutorial
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-navy-700">Editar tutorial</h1>
        <p className="text-sm text-muted">
          Atualize os passos e a mídia. As alterações ficam visíveis para todos.
        </p>
      </div>

      {media && media.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <Label>Mídia atual</Label>
            <ul className="space-y-2">
              {media.map((m) => {
                const Icon = isImage(m.mime_type)
                  ? ImageIcon
                  : isVideo(m.mime_type)
                    ? Film
                    : FileText;
                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-surface-muted px-3 py-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-navy-500" />
                      <span className="truncate">{m.file_name}</span>
                      <span className="shrink-0 text-xs text-faint">
                        {humanSize(m.size_bytes)}
                      </span>
                    </span>
                    <form action={deleteTutorialMediaAction}>
                      <input type="hidden" name="mediaId" value={m.id} />
                      <input type="hidden" name="tutorialId" value={id} />
                      <button
                        type="submit"
                        title="Remover"
                        className="text-muted hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <TutorialForm
        userId={profile.id}
        systems={systems ?? []}
        tutorial={{
          id: tutorial.id,
          title: tutorial.title,
          content: tutorial.content,
          system_id: tutorial.system_id,
          category: tutorial.category,
        }}
      />
    </div>
  );
}
