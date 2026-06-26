-- ============================================================================
-- Controle de acesso: status de conta, troca de senha, último acesso, auditoria
-- ============================================================================

-- Status da conta
do $$ begin
  create type public.user_status as enum ('pending', 'active', 'disabled');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists status public.user_status not null default 'pending',
  add column if not exists must_change_password boolean not null default false,
  add column if not exists last_login_at timestamptz;

-- Trilha de auditoria (ações sensíveis)
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_email text,
  action text not null,
  target_id uuid,
  target_email text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

-- Só administradores leem a auditoria. Escrita é feita pelo service role
-- (createAdminClient), que ignora RLS — não há policy de insert.
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log
  for select to authenticated using (public.is_admin());

-- ----------------------------------------------------------------------------
-- handle_new_user: define status/papel/troca-de-senha conforme a origem
--   • primeiro usuário do sistema  -> admin, ativo
--   • criado pelo admin (provisioned=true no metadata) -> ativo, papel informado,
--     com troca de senha obrigatória se must_change=true
--   • auto-cadastro -> pendente (aguarda aprovação)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text;
  v_email_domain text;
  v_is_first boolean;
  v_provisioned boolean;
  v_role public.user_role;
  v_status public.user_status;
  v_must boolean;
begin
  select allowed_email_domain into v_domain from public.app_config where id = true;
  v_email_domain := lower(split_part(new.email, '@', 2));

  if v_domain is not null and v_domain <> '' and v_email_domain <> lower(v_domain) then
    raise exception 'Domínio de e-mail não autorizado: %', v_email_domain
      using errcode = 'check_violation';
  end if;

  select not exists (select 1 from public.profiles) into v_is_first;
  v_provisioned := coalesce(new.raw_user_meta_data->>'provisioned', '') = 'true';

  if v_is_first then
    v_role := 'admin'; v_status := 'active'; v_must := false;
  elsif v_provisioned then
    v_role := coalesce(
      nullif(new.raw_user_meta_data->>'role', '')::public.user_role,
      'requester'::public.user_role
    );
    v_status := 'active';
    v_must := coalesce(new.raw_user_meta_data->>'must_change', '') = 'true';
  else
    v_role := 'requester'; v_status := 'pending'; v_must := false;
  end if;

  insert into public.profiles (id, email, full_name, role, status, must_change_password)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_role,
    v_status,
    v_must
  );

  return new;
end;
$$;
