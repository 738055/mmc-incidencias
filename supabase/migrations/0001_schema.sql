-- ============================================================================
-- MMC Incidências — Esquema inicial
-- Postgres / Supabase. Segurança: RLS ligado e deny-by-default em tudo.
-- ============================================================================

-- Extensões -----------------------------------------------------------------
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists vector;      -- embeddings (IA, Fase 2)

-- Tipos ---------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('requester', 'technician', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.incident_status as enum ('open', 'in_progress', 'resolved', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.incident_priority as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null; end $$;

-- Configuração da aplicação (defesa em profundidade p/ domínio de e-mail) ----
create table if not exists public.app_config (
  id boolean primary key default true check (id),       -- linha única
  allowed_email_domain text not null,
  updated_at timestamptz not null default now()
);

-- Perfis (1:1 com auth.users) -----------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  role public.user_role not null default 'requester',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Empresas parceiras (terceiros que atendem incidências) --------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  contact_emails text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Catálogo de sistemas ------------------------------------------------------
create table if not exists public.systems (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Incidências ---------------------------------------------------------------
create sequence if not exists public.incident_ref_seq;

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  ref bigint not null default nextval('public.incident_ref_seq') unique,
  title text not null check (char_length(title) between 3 and 160),
  description text not null check (char_length(description) between 3 and 8000),
  system_id uuid references public.systems (id) on delete set null,
  company_id uuid references public.companies (id) on delete set null,
  category text,
  priority public.incident_priority not null default 'medium',
  status public.incident_status not null default 'open',
  created_by uuid not null references public.profiles (id) on delete restrict,
  assigned_to uuid references public.profiles (id) on delete set null,
  resolution text,
  ai_analysis text,
  embedding vector(1024),                    -- preenchido na Fase 2 (IA)
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('portuguese',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(resolution, ''))
  ) stored
);

create index if not exists incidents_search_idx on public.incidents using gin (search);
create index if not exists incidents_status_idx on public.incidents (status);
create index if not exists incidents_created_by_idx on public.incidents (created_by);
create index if not exists incidents_company_idx on public.incidents (company_id);

-- Comentários ---------------------------------------------------------------
create table if not exists public.incident_comments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists comments_incident_idx on public.incident_comments (incident_id);

-- Anexos (imagens etc., armazenados no Supabase Storage) --------------------
create table if not exists public.incident_attachments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  ai_description text,                        -- análise de imagem pela IA (Fase 2)
  created_at timestamptz not null default now()
);
create index if not exists attachments_incident_idx on public.incident_attachments (incident_id);
