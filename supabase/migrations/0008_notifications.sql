-- ============================================================================
-- Notificações in-app
-- Geradas a cada mudança de status, atribuição, conclusão e novo comentário.
-- A INSERÇÃO é feita pelo servidor (service role, ignora RLS) para que a equipe
-- possa notificar o solicitante (usuário diferente). Cada usuário só LÊ/ALTERA
-- as próprias notificações.
-- ============================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  incident_id uuid references public.incidents (id) on delete cascade,
  type text not null,                  -- status_change | comment | assigned | resolved
  title text not null,
  body text,
  link text,                           -- ex.: /incidencias/<id> ou /melhorias/<id>
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;

-- Cada usuário lê apenas as próprias.
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

-- Cada usuário marca as próprias como lidas (sem trocar o dono).
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Cada usuário pode apagar as próprias.
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

-- Sem policy de INSERT para authenticated: criação é exclusiva do service role.
