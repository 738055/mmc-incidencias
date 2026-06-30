import { z } from "zod";

/** Schemas Zod — validação compartilhada entre cliente e servidor. */

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido").max(160),
  password: z.string().min(1, "Informe a senha").max(200),
});

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, "Informe seu nome completo")
    .max(120, "Nome muito longo"),
  email: z.string().email("E-mail inválido").max(160).toLowerCase(),
  password: z
    .string()
    .min(8, "A senha deve ter ao menos 8 caracteres")
    .max(200)
    .regex(/[a-z]/, "Inclua uma letra minúscula")
    .regex(/[A-Z]/, "Inclua uma letra maiúscula")
    .regex(/[0-9]/, "Inclua um número"),
});

export const strongPassword = z
  .string()
  .min(8, "A senha deve ter ao menos 8 caracteres")
  .max(200)
  .regex(/[a-z]/, "Inclua uma letra minúscula")
  .regex(/[A-Z]/, "Inclua uma letra maiúscula")
  .regex(/[0-9]/, "Inclua um número");

export const emailOnlySchema = z.object({
  email: z.string().email("E-mail inválido").max(160).toLowerCase(),
});

export const newPasswordSchema = z
  .object({
    password: strongPassword,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não conferem",
    path: ["confirm"],
  });

export const createUserSchema = z
  .object({
    fullName: z.string().min(2, "Informe o nome").max(120),
    email: z.string().email("E-mail inválido").max(160).toLowerCase(),
    role: z.enum(["requester", "technician", "admin", "partner"]),
    companyId: z.string().uuid().optional().or(z.literal("")),
  })
  .refine((d) => d.role !== "partner" || !!d.companyId, {
    message: "Selecione a empresa do desenvolvedor parceiro",
    path: ["companyId"],
  });

export const tutorialSchema = z.object({
  title: z.string().min(3, "Título muito curto").max(200),
  content: z.string().max(20000).optional().or(z.literal("")),
  systemId: z.string().uuid().optional().or(z.literal("")),
  category: z.string().max(80).optional().or(z.literal("")),
});

export const incidentSchema = z.object({
  kind: z.enum(["incident", "improvement"]).default("incident"),
  title: z.string().min(3, "Título muito curto").max(160),
  description: z.string().min(3, "Descreva o problema").max(8000),
  systemId: z.string().uuid().optional().or(z.literal("")),
  companyId: z.string().uuid().optional().or(z.literal("")),
  category: z.string().max(80).optional().or(z.literal("")),
  stakeholderArea: z.string().max(120).optional().or(z.literal("")),
  benefit: z.string().max(2000).optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high", "critical"]),
});

export const commentSchema = z.object({
  incidentId: z.string().uuid(),
  body: z.string().min(1, "Comentário vazio").max(4000),
});

export const resolveSchema = z.object({
  incidentId: z.string().uuid(),
  resolution: z.string().min(3, "Descreva a solução aplicada").max(8000),
});

export const priorityChangeSchema = z.object({
  incidentId: z.string().uuid(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  reason: z
    .string()
    .min(3, "Explique o motivo da repriorização")
    .max(500, "Motivo muito longo"),
});

export const triageSchema = z
  .object({
    incidentId: z.string().uuid(),
    decision: z.enum(["accept", "reject"]),
    // Observação no aceite (opcional, refina o pedido) OU motivo da recusa
    // (obrigatório).
    note: z.string().max(2000).optional().or(z.literal("")),
  })
  .refine(
    (d) => d.decision !== "reject" || (!!d.note && d.note.trim().length >= 3),
    { message: "Informe o motivo da recusa", path: ["note"] },
  );

export const companySchema = z.object({
  name: z.string().min(2).max(120),
  contactEmails: z.string().max(1000), // lista separada por vírgula/linha
});

export const systemSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().or(z.literal("")),
  developerEmail: z
    .string()
    .email("E-mail do dev inválido")
    .max(160)
    .toLowerCase()
    .optional()
    .or(z.literal("")),
  developerName: z.string().max(120).optional().or(z.literal("")),
  companyId: z.string().uuid().optional().or(z.literal("")),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type IncidentInput = z.infer<typeof incidentSchema>;
