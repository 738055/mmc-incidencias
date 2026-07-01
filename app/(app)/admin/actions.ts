"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import {
  companySchema,
  systemSchema,
  systemDeveloperSchema,
  departmentSchema,
  manualMetricSchema,
  createUserSchema,
} from "@/lib/validations";
import type { SystemDeveloper } from "@/lib/supabase/types";
import { logAudit } from "@/lib/audit";
import { sendWelcomeEmail } from "@/lib/email/send";
import { embedText } from "@/lib/ai";
import type { UserRole, UserStatus } from "@/lib/supabase/types";

/** Gera uma senha inicial forte (atende à política: minúscula, maiúscula, número). */
function generatePassword(): string {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const all = lower + upper + digits;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  let pwd = pick(upper) + pick(lower) + pick(digits);
  for (let i = 0; i < 7; i++) pwd += pick(all);
  return pwd
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

/** Lê os desenvolvedores (JSON do form), valida cada um e dedup por e-mail. */
function parseDevelopers(raw: FormDataEntryValue | null): SystemDeveloper[] {
  if (typeof raw !== "string" || !raw) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const devs: SystemDeveloper[] = [];
  for (const item of arr) {
    const p = systemDeveloperSchema.safeParse(item);
    if (p.success) devs.push({ name: p.data.name.trim(), email: p.data.email });
  }
  return devs.filter((d, i, a) => a.findIndex((x) => x.email === d.email) === i);
}

/** Extrai e-mails válidos de um texto separado por vírgula/; / quebra de linha. */
function parseEmailList(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function requireAdmin() {
  const profile = await requireProfile();
  if (profile.role !== "admin") throw new Error("Acesso restrito a administradores.");
  return profile;
}

export async function createSystemAction(formData: FormData) {
  await requireAdmin();
  const parsed = systemSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    companyId: formData.get("companyId") ?? "",
  });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("systems").insert({
    name: parsed.data.name,
    description: parsed.data.description || null,
    developers: parseDevelopers(formData.get("developers")),
    company_id: parsed.data.companyId || null,
  });
  revalidatePath("/sistemas");
}

export async function toggleSystemAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  const supabase = await createClient();
  await supabase.from("systems").update({ active: !active }).eq("id", id);
  revalidatePath("/sistemas");
}

export async function updateSystemAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const parsed = systemSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    companyId: formData.get("companyId") ?? "",
  });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase
    .from("systems")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      developers: parseDevelopers(formData.get("developers")),
      company_id: parsed.data.companyId || null,
    })
    .eq("id", id);
  revalidatePath("/sistemas");
  redirect("/sistemas");
}

export async function createCompanyAction(formData: FormData) {
  await requireAdmin();
  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    contactEmails: formData.get("contactEmails") ?? "",
  });
  if (!parsed.success) return;

  const emails = parseEmailList(parsed.data.contactEmails);

  const supabase = await createClient();
  await supabase.from("companies").insert({
    name: parsed.data.name,
    slug: slugify(parsed.data.name),
    contact_emails: emails,
  });
  revalidatePath("/empresas");
}

export async function toggleCompanyAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  const supabase = await createClient();
  await supabase.from("companies").update({ active: !active }).eq("id", id);
  revalidatePath("/empresas");
}

export async function updateCompanyAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    contactEmails: formData.get("contactEmails") ?? "",
  });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase
    .from("companies")
    .update({
      name: parsed.data.name,
      slug: slugify(parsed.data.name),
      contact_emails: parseEmailList(parsed.data.contactEmails),
    })
    .eq("id", id);
  revalidatePath("/empresas");
  redirect("/empresas");
}

export async function createDepartmentAction(formData: FormData) {
  await requireAdmin();
  const parsed = departmentSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("departments").insert({
    name: parsed.data.name,
    slug: slugify(parsed.data.name),
  });
  revalidatePath("/departamentos");
}

export async function updateDepartmentAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const parsed = departmentSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase
    .from("departments")
    .update({ name: parsed.data.name, slug: slugify(parsed.data.name) })
    .eq("id", id);
  revalidatePath("/departamentos");
}

export async function toggleDepartmentAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  const supabase = await createClient();
  await supabase.from("departments").update({ active: !active }).eq("id", id);
  revalidatePath("/departamentos");
}

/** Vincula (ou desvincula) um usuário a um departamento. */
export async function setDepartmentAction(formData: FormData) {
  const actor = await requireAdmin();
  const id = String(formData.get("id"));
  const departmentId = String(formData.get("departmentId") || "");
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ department_id: departmentId || null })
    .eq("id", id);
  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "user.department_change",
    targetId: id,
    details: { departmentId: departmentId || null },
  });
  revalidatePath("/admin");
}

function metricInput(formData: FormData) {
  return manualMetricSchema.safeParse({
    label: formData.get("label"),
    value: formData.get("value"),
    unit: formData.get("unit") ?? "",
    period: formData.get("period") ?? "",
    note: formData.get("note") ?? "",
  });
}

export async function createManualMetricAction(formData: FormData) {
  await requireAdmin();
  const parsed = metricInput(formData);
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("manual_metrics").insert({
    label: parsed.data.label,
    value: parsed.data.value,
    unit: parsed.data.unit || null,
    period: parsed.data.period || null,
    note: parsed.data.note || null,
  });
  revalidatePath("/metricas");
  revalidatePath("/indicadores");
}

export async function updateManualMetricAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const parsed = metricInput(formData);
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase
    .from("manual_metrics")
    .update({
      label: parsed.data.label,
      value: parsed.data.value,
      unit: parsed.data.unit || null,
      period: parsed.data.period || null,
      note: parsed.data.note || null,
    })
    .eq("id", id);
  revalidatePath("/metricas");
  revalidatePath("/indicadores");
}

export async function deleteManualMetricAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("manual_metrics").delete().eq("id", id);
  revalidatePath("/metricas");
  revalidatePath("/indicadores");
}

export async function setRoleAction(formData: FormData) {
  const actor = await requireAdmin();
  const id = String(formData.get("id"));
  const role = String(formData.get("role")) as UserRole;
  if (!["requester", "technician", "admin"].includes(role)) return;
  if (id === actor.id) return; // não altera o próprio papel
  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", id);
  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "user.role_change",
    targetId: id,
    details: { role },
  });
  revalidatePath("/admin");
}

export type CreateUserState = {
  error?: string;
  createdEmail?: string;
  tempPassword?: string;
  emailSent?: boolean;
  emailError?: string;
};

/** Cria um usuário já ativo, com senha inicial e troca obrigatória no 1º acesso. */
export async function createUserAction(
  _prev: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const actor = await requireAdmin();

  const parsed = createUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
    companyId: formData.get("companyId") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  // Convite do admin pode ser de QUALQUER domínio (parceiros/terceirizados).
  // A restrição de `ALLOWED_EMAIL_DOMAIN` vale apenas para o autocadastro.

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Configure SUPABASE_SERVICE_ROLE_KEY no servidor para criar usuários.",
    };
  }

  const tempPassword = generatePassword();
  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
      role: parsed.data.role,
      provisioned: "true",
      must_change: "true",
      ...(parsed.data.role === "partner" && parsed.data.companyId
        ? { company_id: parsed.data.companyId }
        : {}),
    },
  });

  if (error) {
    const msg = /already|registered|exists/i.test(error.message)
      ? "Já existe uma conta com este e-mail."
      : "Não foi possível criar o usuário.";
    return { error: msg };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const result = await sendWelcomeEmail({
    name: parsed.data.fullName,
    email: parsed.data.email,
    tempPassword,
    loginUrl: `${appUrl}/login`,
  });

  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "user.create",
    targetEmail: parsed.data.email,
    details: { role: parsed.data.role, emailSent: result.ok },
  });

  revalidatePath("/admin");
  return {
    createdEmail: parsed.data.email,
    tempPassword,
    emailSent: result.ok,
    emailError: result.ok
      ? undefined
      : result.skipped
        ? "RESEND_API_KEY/EMAIL_FROM ausentes no servidor."
        : result.error,
  };
}

/** Aprova um cadastro pendente (status -> ativo). */
export async function approveUserAction(formData: FormData) {
  const actor = await requireAdmin();
  const id = String(formData.get("id"));
  const role = String(formData.get("role") || "requester") as UserRole;
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({
      status: "active",
      role: ["requester", "technician", "admin"].includes(role)
        ? role
        : "requester",
    })
    .eq("id", id);
  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "user.approve",
    targetId: id,
    details: { role },
  });
  revalidatePath("/admin");
}

/** Ativa ou desativa o acesso de um usuário (revogação instantânea). */
export async function setStatusAction(formData: FormData) {
  const actor = await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as UserStatus;
  if (!["active", "disabled"].includes(status)) return;
  if (id === actor.id) return; // não desativa a si mesmo
  const supabase = await createClient();
  await supabase.from("profiles").update({ status }).eq("id", id);
  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: status === "disabled" ? "user.disable" : "user.enable",
    targetId: id,
  });
  revalidatePath("/admin");
}

/**
 * Reprocessa a base semântica (KB): gera o `embedding` que falta em chamados
 * concluídos e tutoriais publicados, em lote. Útil após importar dados antigos
 * ou ligar a IA depois. Só admin; tolerante a falhas (sem IA, é no-op).
 */
export async function backfillEmbeddingsAction() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: incs } = await admin
    .from("incidents")
    .select("id, title, description, resolution")
    .in("status", ["resolved", "closed", "delivered"])
    .is("embedding", null)
    .limit(100);
  for (const i of incs ?? []) {
    const text = [i.title, i.description, i.resolution].filter(Boolean).join("\n\n");
    const emb = await embedText(text);
    if (emb) {
      await admin
        .from("incidents")
        .update({ embedding: `[${emb.join(",")}]` })
        .eq("id", i.id);
    }
  }

  const { data: tuts } = await admin
    .from("tutorials")
    .select("id, title, content, category, transcript")
    .eq("published", true)
    .is("embedding", null)
    .limit(100);
  for (const t of tuts ?? []) {
    const text = [t.title, t.category, t.content, t.transcript]
      .filter(Boolean)
      .join("\n\n");
    const emb = await embedText(text);
    if (emb) {
      await admin
        .from("tutorials")
        .update({ embedding: `[${emb.join(",")}]` })
        .eq("id", t.id);
    }
  }

  revalidatePath("/admin");
}

export async function updateProfileAction(formData: FormData) {
  const profile = await requireProfile();
  const fullName = String(formData.get("fullName") || "").trim().slice(0, 120);
  if (fullName.length < 2) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ full_name: fullName }).eq("id", profile.id);
  revalidatePath("/perfil");
}
