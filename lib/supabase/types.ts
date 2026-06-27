/**
 * Tipos do banco de dados (espelham as migrações em supabase/migrations).
 * Mantido manualmente; pode ser regenerado com `supabase gen types typescript`.
 */

export type UserRole = "requester" | "technician" | "admin";
export type UserStatus = "pending" | "active" | "disabled";
export type TicketKind = "incident" | "improvement";
export type IncidentStatus =
  // incidências
  | "open"
  | "in_progress"
  | "resolved"
  | "closed"
  // melhorias & desenvolvimento
  | "requested"
  | "in_analysis"
  | "approved"
  | "in_development"
  | "delivered"
  | "rejected";
export type IncidentPriority = "low" | "medium" | "high" | "critical";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  must_change_password: boolean;
  last_login_at: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type AuditLog = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_id: string | null;
  target_email: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export type Company = {
  id: string;
  name: string;
  slug: string;
  contact_emails: string[];
  active: boolean;
  created_at: string;
}

export type SystemRecord = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
}

export type Incident = {
  id: string;
  ref: number;
  kind: TicketKind;
  title: string;
  description: string;
  system_id: string | null;
  company_id: string | null;
  category: string | null;
  stakeholder_area: string | null;
  benefit: string | null;
  priority: IncidentPriority;
  status: IncidentStatus;
  created_by: string;
  assigned_to: string | null;
  resolution: string | null;
  ai_analysis: string | null;
  /** Refs dos chamados resolvidos citados na triagem de IA (aprendizado por feedback). */
  ai_suggested_refs: number[] | null;
  /** Embedding (pgvector) serializado como texto "[...]"; preenchido pela IA. */
  embedding: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export type IncidentComment = {
  id: string;
  incident_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export type IncidentAttachment = {
  id: string;
  incident_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  ai_description: string | null;
  created_at: string;
}

export type MediaKind = "image" | "video" | "file";

export type Tutorial = {
  id: string;
  title: string;
  content: string;
  system_id: string | null;
  category: string | null;
  published: boolean;
  transcript: string | null;
  /** Embedding (pgvector) serializado como texto "[...]"; preenchido pela IA. */
  embedding: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Resultado da RPC `match_tutorials` (busca semântica de tutoriais). */
export type MatchedTutorial = {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  similarity: number;
}

export type TutorialMedia = {
  id: string;
  tutorial_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  kind: MediaKind;
  sort: number;
  created_at: string;
}

export type NotificationType =
  | "status_change"
  | "comment"
  | "assigned"
  | "resolved";

export type Notification = {
  id: string;
  user_id: string;
  incident_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

/** Assinatura de Web Push de um dispositivo/navegador. */
export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

/** Avaliação (👍/👎) da equipe sobre uma sugestão de IA num chamado. */
export type AiSuggestionFeedback = {
  id: string;
  incident_id: string;
  user_id: string;
  helpful: boolean;
  created_at: string;
}

/** Resultado da RPC `match_incidents` (busca semântica por similaridade). */
export type MatchedIncident = {
  ref: number;
  title: string;
  resolution: string | null;
  similarity: number;
}

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type TableType<T, R extends Rel[] = []> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: R;
};

type IncidentRels = [
  {
    foreignKeyName: "incidents_system_id_fkey";
    columns: ["system_id"];
    referencedRelation: "systems";
    referencedColumns: ["id"];
    isOneToOne: false;
  },
  {
    foreignKeyName: "incidents_company_id_fkey";
    columns: ["company_id"];
    referencedRelation: "companies";
    referencedColumns: ["id"];
    isOneToOne: false;
  },
  {
    foreignKeyName: "incidents_created_by_fkey";
    columns: ["created_by"];
    referencedRelation: "profiles";
    referencedColumns: ["id"];
    isOneToOne: false;
  },
  {
    foreignKeyName: "incidents_assigned_to_fkey";
    columns: ["assigned_to"];
    referencedRelation: "profiles";
    referencedColumns: ["id"];
    isOneToOne: false;
  },
];

type CommentRels = [
  {
    foreignKeyName: "incident_comments_incident_id_fkey";
    columns: ["incident_id"];
    referencedRelation: "incidents";
    referencedColumns: ["id"];
    isOneToOne: false;
  },
  {
    foreignKeyName: "incident_comments_author_id_fkey";
    columns: ["author_id"];
    referencedRelation: "profiles";
    referencedColumns: ["id"];
    isOneToOne: false;
  },
];

type AttachmentRels = [
  {
    foreignKeyName: "incident_attachments_incident_id_fkey";
    columns: ["incident_id"];
    referencedRelation: "incidents";
    referencedColumns: ["id"];
    isOneToOne: false;
  },
  {
    foreignKeyName: "incident_attachments_uploaded_by_fkey";
    columns: ["uploaded_by"];
    referencedRelation: "profiles";
    referencedColumns: ["id"];
    isOneToOne: false;
  },
];

type TutorialRels = [
  {
    foreignKeyName: "tutorials_system_id_fkey";
    columns: ["system_id"];
    referencedRelation: "systems";
    referencedColumns: ["id"];
    isOneToOne: false;
  },
  {
    foreignKeyName: "tutorials_created_by_fkey";
    columns: ["created_by"];
    referencedRelation: "profiles";
    referencedColumns: ["id"];
    isOneToOne: false;
  },
];

type TutorialMediaRels = [
  {
    foreignKeyName: "tutorial_media_tutorial_id_fkey";
    columns: ["tutorial_id"];
    referencedRelation: "tutorials";
    referencedColumns: ["id"];
    isOneToOne: false;
  },
];

export interface Database {
  public: {
    Tables: {
      profiles: TableType<Profile>;
      companies: TableType<Company>;
      systems: TableType<SystemRecord>;
      incidents: TableType<Incident, IncidentRels>;
      incident_comments: TableType<IncidentComment, CommentRels>;
      incident_attachments: TableType<IncidentAttachment, AttachmentRels>;
      audit_log: TableType<AuditLog>;
      notifications: TableType<Notification>;
      push_subscriptions: TableType<PushSubscriptionRow>;
      ai_suggestion_feedback: TableType<AiSuggestionFeedback>;
      tutorials: TableType<Tutorial, TutorialRels>;
      tutorial_media: TableType<TutorialMedia, TutorialMediaRels>;
    };
    Views: Record<string, never>;
    Functions: {
      match_incidents: {
        Args: {
          query_embedding: string;
          match_count?: number;
          similarity_threshold?: number;
          p_exclude_id?: string | null;
        };
        Returns: MatchedIncident[];
      };
      match_tutorials: {
        Args: {
          query_embedding: string;
          match_count?: number;
          similarity_threshold?: number;
        };
        Returns: MatchedTutorial[];
      };
      unhelpful_refs: {
        Args: Record<string, never>;
        Returns: { ref: number }[];
      };
    };
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
      ticket_kind: TicketKind;
      incident_status: IncidentStatus;
      incident_priority: IncidentPriority;
    };
    CompositeTypes: Record<string, never>;
  };
}
