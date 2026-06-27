-- ============================================================================
-- Web Push: assinaturas de notificação do navegador (PushSubscription).
-- Cada dispositivo/navegador registra um endpoint + chaves (p256dh/auth). O
-- envio é feito pelo servidor (service role) via `web-push` com as chaves VAPID.
-- Cada usuário gere apenas as próprias assinaturas (RLS).
-- ============================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Cada usuário lê as próprias.
drop policy if exists push_subscriptions_select on public.push_subscriptions;
create policy push_subscriptions_select on public.push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

-- Cada usuário registra assinatura para si mesmo.
drop policy if exists push_subscriptions_insert on public.push_subscriptions;
create policy push_subscriptions_insert on public.push_subscriptions
  for insert to authenticated
  with check (user_id = auth.uid());

-- Cada usuário remove as próprias (ao desativar / trocar de dispositivo).
drop policy if exists push_subscriptions_delete on public.push_subscriptions;
create policy push_subscriptions_delete on public.push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());
