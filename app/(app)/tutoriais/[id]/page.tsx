import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  GraduationCap,
  Server,
  Tag,
  CalendarDays,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { isStaff } from "@/lib/domain";
import { Card, CardContent } from "@/components/ui/card";
import { MediaGrid } from "@/components/media/media-grid";
import { formatDateTime } from "@/lib/utils";
import { deleteTutorialAction } from "../actions";

export const metadata: Metadata = { title: "Tutorial" };

const SIGNED_TTL = 60 * 60; // 1h

export default async function TutorialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: tutorial } = await supabase
    .from("tutorials")
    .select(
      "*, systems(name), creator:profiles!tutorials_created_by_fkey(full_name, email)",
    )
    .eq("id", id)
    .single();

  if (!tutorial) notFound();

  const { data: media } = await supabase
    .from("tutorial_media")
    .select("*")
    .eq("tutorial_id", id)
    .order("sort");

  const signed: Record<string, string> = {};
  if (media?.length) {
    const { data } = await supabase.storage
      .from("attachments")
      .createSignedUrls(
        media.map((m) => m.storage_path),
        SIGNED_TTL,
      );
    data?.forEach((d, i) => {
      if (d.signedUrl) signed[media[i].storage_path] = d.signedUrl;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tutorial as any;
  const staff = isStaff(profile.role);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/tutoriais"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-navy-700"
      >
        <ArrowLeft className="h-4 w-4" /> Tutoriais
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-navy-700">
            <GraduationCap className="h-7 w-7 shrink-0" />
            {t.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            {t.systems?.name && (
              <span className="flex items-center gap-1.5">
                <Server className="h-4 w-4 text-faint" /> {t.systems.name}
              </span>
            )}
            {t.category && (
              <span className="flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-faint" /> {t.category}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-faint" />
              {formatDateTime(t.created_at)}
            </span>
          </div>
        </div>
        {staff && (
          <form action={deleteTutorialAction}>
            <input type="hidden" name="id" value={t.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          </form>
        )}
      </div>

      {media && media.length > 0 && (
        <MediaGrid
          items={media.map((m) => ({
            url: signed[m.storage_path],
            name: m.file_name,
            mime: m.mime_type,
          }))}
        />
      )}

      {t.content && (
        <Card>
          <CardContent className="pt-5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {t.content}
            </p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-faint">
        Criado por {t.creator?.full_name || t.creator?.email}
      </p>
    </div>
  );
}
