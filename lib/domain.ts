import type {
  IncidentPriority,
  IncidentStatus,
  TicketKind,
  UserRole,
  UserStatus,
} from "./supabase/types";

/** Rótulos e estilos de exibição para os enums do domínio (pt-BR). */

export const KIND_LABELS: Record<TicketKind, string> = {
  incident: "Incidência",
  improvement: "Melhoria",
};

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  // incidências
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
  // melhorias
  requested: "Solicitada",
  in_analysis: "Em análise",
  approved: "Aprovada",
  in_development: "Em desenvolvimento",
  delivered: "Entregue",
  rejected: "Recusada",
};

export const STATUS_TONE: Record<IncidentStatus, string> = {
  open: "bg-blue-50 text-blue-700 ring-blue-200",
  in_progress: "bg-amber-50 text-amber-700 ring-amber-200",
  resolved: "bg-green-50 text-green-700 ring-green-200",
  closed: "bg-gray-100 text-gray-600 ring-gray-200",
  requested: "bg-blue-50 text-blue-700 ring-blue-200",
  in_analysis: "bg-violet-50 text-violet-700 ring-violet-200",
  approved: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  in_development: "bg-amber-50 text-amber-700 ring-amber-200",
  delivered: "bg-green-50 text-green-700 ring-green-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
};

export const PRIORITY_LABELS: Record<IncidentPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export const PRIORITY_TONE: Record<IncidentPriority, string> = {
  low: "bg-slate-100 text-slate-600 ring-slate-200",
  medium: "bg-sky-50 text-sky-700 ring-sky-200",
  high: "bg-orange-50 text-orange-700 ring-orange-200",
  critical: "bg-red-50 text-red-700 ring-red-200",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  requester: "Solicitante",
  technician: "Técnico",
  admin: "Administrador",
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  pending: "Pendente",
  active: "Ativo",
  disabled: "Desativado",
};

export const USER_STATUS_TONE: Record<UserStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  active: "bg-green-50 text-green-700 ring-green-200",
  disabled: "bg-gray-100 text-gray-500 ring-gray-200",
};

/** Rótulos legíveis das ações de auditoria. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "user.create": "Usuário criado",
  "user.approve": "Usuário aprovado",
  "user.enable": "Conta ativada",
  "user.disable": "Conta desativada",
  "user.role_change": "Papel alterado",
  "password.change": "Senha alterada",
  "password.reset_request": "Redefinição de senha solicitada",
};

/** Ordem dos status por tipo de solicitação. */
export const INCIDENT_STATUS_ORDER: IncidentStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];

export const IMPROVEMENT_STATUS_ORDER: IncidentStatus[] = [
  "requested",
  "in_analysis",
  "approved",
  "in_development",
  "delivered",
  "rejected",
];

export const ALL_STATUSES: IncidentStatus[] = [
  ...INCIDENT_STATUS_ORDER,
  ...IMPROVEMENT_STATUS_ORDER,
];

/** Retro-compat: usado em filtros antigos de incidências. */
export const STATUS_ORDER = INCIDENT_STATUS_ORDER;

export function statusOrderFor(kind: TicketKind): IncidentStatus[] {
  return kind === "improvement"
    ? IMPROVEMENT_STATUS_ORDER
    : INCIDENT_STATUS_ORDER;
}

/** Status inicial ao abrir uma solicitação. */
export function initialStatusFor(kind: TicketKind): IncidentStatus {
  return kind === "improvement" ? "requested" : "open";
}

/** Status terminal de sucesso (resolvido/entregue). */
export function doneStatusFor(kind: TicketKind): IncidentStatus {
  return kind === "improvement" ? "delivered" : "resolved";
}

/** Status considerados "concluídos" (não exigem mais ação). */
export function isDoneStatus(status: IncidentStatus): boolean {
  return ["resolved", "closed", "delivered", "rejected"].includes(status);
}

export const PRIORITY_ORDER: IncidentPriority[] = [
  "critical",
  "high",
  "medium",
  "low",
];

/** Categorias sugeridas (alinhadas aos temas citados pelo time). */
export const CATEGORIES = [
  "Sistema / Aplicação",
  "Rede / Conectividade",
  "Acesso / Permissões",
  "Segurança",
  "Integração / API",
  "Banco de dados",
  "Outro",
] as const;

export function isStaff(role: UserRole | undefined | null) {
  return role === "technician" || role === "admin";
}
