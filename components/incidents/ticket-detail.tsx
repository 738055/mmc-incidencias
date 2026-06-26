import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Paperclip,
  Building2,
  Server,
  User,
  UserCheck,
  FileText,
  Target,
  Lightbulb,
  MessageSquare,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { isStaff, isDoneStatus, statusOrderFor, STATUS_LABELS } from "@/lib/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, PriorityBadge } from "@/components/incidents/badges";
import { CommentForm } from "@/components/incidents/comment-form";
import { ResolvePanel } from "@/components/incidents/resolve-panel";
import {
  assignToMeAction,
  updateStatusAction,
} from "@/app/(app)/incidencias/actions";
import { formatDateTime } from "@/lib/utils";
import type { TicketKind } from "@/lib/supabase/types";

/**
 * Detalhe de um ticket (incidência ou melhoria). Reutilizado pelas rotas
 * /incidencias/[id] e /melhorias/[id]. `backHref` define a navegação de volta.
 */
export async function TicketDetail({
  id,
  expectedKind,
  backHref,
  backLabel,
}: {
  id: string;
  expectedKind: TicketKind;
  backHref: string;
  backLabel: string;
}) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: incident } = await supabase
    .from("incidents")
    .select(
      `*, systems(name), companies(name),
       creator:profiles!incidents_created_by_fkey(full_name, email),
       assignee:profiles!incidents_assigned_to_fkey(full_name, email)`,
    )
    .eq("id", id)
    .single();

  if (!incident) notFound();

  const [{ data: comments }, { data: attachments }] = await Promise.all([
    supabase
      .from("incident_comments")
      .select("*, author:profiles(full_name, email)")
      .eq("incident_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("incident_attachments")
      .select("*")
      .eq("incident_id", id)
      .order("created_at"),
  ]);

  const signed: Record<string, string> = {};
  if (attachments?.length) {
    const { data } = await supabase.storage
      .from("attachments")
      .createSignedUrls(
        attachments.map((a) => a.storage_path),
        60 * 60,
      );
    data?.forEach((d, i) => {
      if (d.signedUrl) signed[attachments[i].storage_path] = d.signedUrl;
    });
  }

  const staff = isStaff(profile.role);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inc = incident as any;
  const kind: TicketKind = inc.kind ?? expectedKind;
  const isImprovement = kind === "improvement";
  const done = isDoneStatus(inc.status);

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-navy-700"
      >
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label text-sm font-medium text-navy-700">
              #{inc.ref}
            </span>
            <span className="rounded-full bg-surface-sunken px-2.5 py-0.5 font-label text-xs text-muted">
              {isImprovement ? "Melhoria" : "Incidência"}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-700">
            {inc.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Aberto por {inc.creator?.full_name || inc.creator?.email} ·{" "}
            {formatDateTime(inc.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={inc.status} />
          <PriorityBadge priority={inc.priority} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card>
            <CardContent className="pt-5">
              <SectionHeader icon={FileText} title="Descrição do problema" />
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
                {inc.description}
              </p>
            </CardContent>
          </Card>

          {isImprovement && inc.benefit && (
            <Card>
              <CardContent className="pt-5">
                <SectionHeader
                  icon={Lightbulb}
                  title="Justificativa / benefício esperado"
                />
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
                  {inc.benefit}
                </p>
              </CardContent>
            </Card>
          )}

          {inc.ai_analysis && (
            <Card className="relative overflow-hidden">
              <span className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/10" />
              <CardContent className="relative pt-5">
                <h2 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-base font-semibold text-navy-700">
                  <Sparkles className="h-[18px] w-[18px] text-orange-600" />
                  Análise da IA
                </h2>
                <div className="rounded-lg border border-navy-200/40 bg-surface-muted p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {inc.ai_analysis}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {attachments && attachments.length > 0 && (
            <Card>
              <CardContent className="pt-5">
                <SectionHeader
                  icon={Paperclip}
                  title={`Anexos (${attachments.length})`}
                />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {attachments.map((a) => {
                    const url = signed[a.storage_path];
                    const isImage = a.mime_type.startsWith("image/");
                    return (
                      <a
                        key={a.id}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="group block overflow-hidden rounded-lg border border-border transition-colors hover:border-navy-300"
                      >
                        {isImage && url ? (
                          <Image
                            src={url}
                            alt={a.file_name}
                            width={300}
                            height={200}
                            className="h-28 w-full object-cover transition-transform group-hover:scale-105"
                            unoptimized
                          />
                        ) : (
                          <span className="flex h-28 w-full items-center justify-center bg-surface-muted text-faint">
                            <FileText className="h-7 w-7" />
                          </span>
                        )}
                        <span className="block truncate px-2 py-1.5 text-xs text-muted">
                          {a.file_name}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {staff && !done && (
            <Card className="border-l-4 border-l-status-resolved">
              <CardContent className="pt-5">
                <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-status-resolved">
                  <CheckCircle2 className="h-[18px] w-[18px]" />
                  {isImprovement ? "Concluir entrega" : "Resolver chamado"}
                </h2>
                <ResolvePanel incidentId={inc.id} kind={kind} />
              </CardContent>
            </Card>
          )}

          {inc.resolution && (
            <Card className="border-l-4 border-l-status-resolved">
              <CardContent className="pt-5">
                <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-status-resolved">
                  <CheckCircle2 className="h-[18px] w-[18px]" />
                  {isImprovement ? "Entrega" : "Solução"}
                </h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {inc.resolution}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-5">
              <SectionHeader
                icon={MessageSquare}
                title={`Atividades (${comments?.length ?? 0})`}
              />
              <div className="space-y-5">
                {comments?.map((c) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const cc = c as any;
                  return (
                    <div key={cc.id} className="flex gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy-700 text-xs font-semibold text-white">
                        {(cc.author?.full_name || cc.author?.email || "?")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-baseline justify-between text-sm">
                          <span className="font-semibold text-foreground">
                            {cc.author?.full_name || cc.author?.email}
                          </span>{" "}
                          <span className="text-xs text-faint">
                            {formatDateTime(cc.created_at)}
                          </span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-surface-muted p-3 text-sm text-muted">
                          {cc.body}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {(!comments || comments.length === 0) && (
                  <p className="text-sm text-muted">Nenhum comentário ainda.</p>
                )}
              </div>
              <div className="mt-5 border-t border-border pt-4">
                <CommentForm incidentId={inc.id} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <Card>
            <CardContent className="space-y-4 pt-5 text-sm">
              <h2 className="border-b border-border pb-3 text-base font-semibold text-navy-700">
                Detalhes
              </h2>
              <Detail
                icon={CalendarDays}
                label="Data de abertura"
                value={formatDateTime(inc.created_at)}
              />
              <Detail icon={Server} label="Sistema" value={inc.systems?.name} />
              {isImprovement && (
                <>
                  <Detail
                    icon={Target}
                    label="Stakeholder / área"
                    value={inc.stakeholder_area}
                  />
                  <Detail
                    icon={Building2}
                    label="Empresa de desenvolvimento"
                    value={inc.companies?.name}
                  />
                </>
              )}
              {!isImprovement && (
                <>
                  <Detail
                    icon={Building2}
                    label="Empresa parceira"
                    value={inc.companies?.name}
                  />
                  <Detail icon={FileText} label="Categoria" value={inc.category} />
                </>
              )}
              <Detail
                icon={User}
                label="Solicitante"
                value={inc.creator?.full_name || inc.creator?.email}
              />
              <Detail
                icon={UserCheck}
                label="Responsável"
                value={inc.assignee?.full_name || inc.assignee?.email}
              />
            </CardContent>
          </Card>

          {staff && (
            <Card>
              <CardContent className="space-y-3 pt-5">
                <h2 className="border-b border-border pb-3 text-base font-semibold text-navy-700">
                  Ações
                </h2>

                {!inc.assigned_to && (
                  <form action={assignToMeAction}>
                    <input type="hidden" name="incidentId" value={inc.id} />
                    <Button type="submit" variant="outline" className="w-full">
                      Atribuir a mim
                    </Button>
                  </form>
                )}

                <form action={updateStatusAction} className="space-y-2">
                  <input type="hidden" name="incidentId" value={inc.id} />
                  <label className="font-label text-xs font-medium uppercase tracking-wider text-faint">
                    Alterar status
                  </label>
                  <div className="flex gap-2">
                    <select
                      name="status"
                      defaultValue={inc.status}
                      className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm focus-visible:border-navy-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600"
                    >
                      {statusOrderFor(kind).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm">
                      Salvar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: typeof Server;
  title: string;
}) {
  return (
    <h2 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-base font-semibold text-navy-700">
      <Icon className="h-[18px] w-[18px] text-navy-700" />
      {title}
    </h2>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Server;
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="font-label mb-1 text-[11px] font-medium uppercase tracking-wider text-faint">
        {label}
      </p>
      <p className="flex items-center gap-2 font-medium text-foreground">
        <Icon className="h-4 w-4 shrink-0 text-faint" />
        {value || "—"}
      </p>
    </div>
  );
}
