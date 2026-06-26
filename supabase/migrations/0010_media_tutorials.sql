-- ============================================================================
-- Mídia (imagens WebP + vídeos) e módulo de Tutoriais
-- - Amplia o bucket `attachments` para aceitar vídeos (200 MB).
-- - Cria `tutorials` + `tutorial_media`: tutoriais de problemas frequentes,
--   criados SÓ pela equipe de TI, vinculados a sistema/categoria, com mídia.
--
-- ATENÇÃO: para uploads acima de 50 MB, suba também o limite GLOBAL do Storage
-- em Supabase → Project Settings → Storage (Upload file size limit).
-- ============================================================================

-- Bucket de anexos: aceita vídeos e arquivos maiores (200 MB) ------------------
update storage.buckets
set
  file_size_limit = 209715200,  -- 200 MB
  allowed_mime_types = array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
where id = 'attachments';

-- Tutoriais ------------------------------------------------------------------
create table if not exists public.tutorials (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 200),
  content text not null default '' check (char_length(content) <= 20000),
  system_id uuid references public.systems (id) on delete set null,
  category text,
  published boolean not null default true,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('portuguese',
      coalesce(title, '') || ' ' ||
      coalesce(content, '') || ' ' ||
      coalesce(category, ''))
  ) stored
);

create index if not exists tutorials_search_idx on public.tutorials using gin (search);
create index if not exists tutorials_system_idx on public.tutorials (system_id);
create index if not exists tutorials_category_idx on public.tutorials (category);
create index if not exists tutorials_created_idx on public.tutorials (created_at desc);

drop trigger if exists trg_tutorials_touch on public.tutorials;
create trigger trg_tutorials_touch before update on public.tutorials
  for each row execute function public.touch_updated_at();

-- Mídia dos tutoriais (arquivos no mesmo bucket `attachments`) ----------------
create table if not exists public.tutorial_media (
  id uuid primary key default gen_random_uuid(),
  tutorial_id uuid not null references public.tutorials (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  kind text not null default 'file',  -- image | video | file
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists tutorial_media_tutorial_idx
  on public.tutorial_media (tutorial_id, sort);

-- RLS ------------------------------------------------------------------------
alter table public.tutorials      enable row level security;
alter table public.tutorial_media enable row level security;

-- Todos os autenticados leem tutoriais publicados; a equipe vê todos.
drop policy if exists tutorials_select on public.tutorials;
create policy tutorials_select on public.tutorials
  for select to authenticated
  using (published or public.is_staff());

-- Só a equipe (técnico/admin) cria, edita e remove.
drop policy if exists tutorials_write on public.tutorials;
create policy tutorials_write on public.tutorials
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Mídia segue a visibilidade do tutorial.
drop policy if exists tutorial_media_select on public.tutorial_media;
create policy tutorial_media_select on public.tutorial_media
  for select to authenticated
  using (
    exists (
      select 1 from public.tutorials t
      where t.id = tutorial_id and (t.published or public.is_staff())
    )
  );

drop policy if exists tutorial_media_write on public.tutorial_media;
create policy tutorial_media_write on public.tutorial_media
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());
