-- ============================================================================
-- Desenvolvedores parceiros + Kanban de melhorias
--   • novo papel 'partner' (dev de uma empresa parceira), vinculado a 1 empresa
--   • e-mail do desenvolvedor por sistema
--   • RLS: partner vê e move SÓ as melhorias da sua empresa (status apenas)
-- ============================================================================

-- Novo papel. IF NOT EXISTS torna idempotente.
alter type public.user_role add value if not exists 'partner';

-- Empresa do parceiro (NULL para os demais papéis)
alter table public.profiles
  add column if not exists company_id uuid references public.companies (id) on delete set null;

-- Desenvolvedor responsável pelo sistema (recebe os chamados por e-mail)
alter table public.systems
  add column if not exists developer_email text,
  add column if not exists developer_name text;

-- ----------------------------------------------------------------------------
-- Helper: empresa do parceiro logado (NULL se não for partner).
-- role::text evita referenciar o valor de enum recém-criado nesta transação.
-- SECURITY DEFINER p/ não recursar na RLS de profiles.
-- ----------------------------------------------------------------------------
create or replace function public.partner_company()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles
  where id = auth.uid() and role::text = 'partner';
$$;

-- ----------------------------------------------------------------------------
-- RLS: políticas permissivas adicionais para o parceiro (somam-se por OR às
-- existentes — não enfraquecem nada). Escopo: melhorias da própria empresa.
-- ----------------------------------------------------------------------------
drop policy if exists incidents_partner_select on public.incidents;
create policy incidents_partner_select on public.incidents
  for select to authenticated
  using (
    kind = 'improvement'
    and company_id is not null
    and company_id = public.partner_company()
  );

-- can_view_incident: parceiro enxerga as melhorias da sua empresa (descrição,
-- anexos e comentários no detalhe). Mantém os demais critérios inalterados.
create or replace function public.can_view_incident(p_incident uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.incidents i
    where i.id = p_incident
      and (
        i.created_by = auth.uid()
        or public.is_staff()
        or i.status in ('resolved', 'closed')
        or (i.kind = 'improvement' and i.company_id = public.partner_company())
      )
  );
$$;

drop policy if exists incidents_partner_update on public.incidents;
create policy incidents_partner_update on public.incidents
  for update to authenticated
  using (
    kind = 'improvement'
    and company_id is not null
    and company_id = public.partner_company()
  )
  with check (
    kind = 'improvement'
    and company_id is not null
    and company_id = public.partner_company()
  );

-- ----------------------------------------------------------------------------
-- guard_incident_fields: equipe muda tudo; parceiro da empresa do chamado muda
-- SÓ o status; demais não-staff continuam barrados em campos restritos.
-- ----------------------------------------------------------------------------
create or replace function public.guard_incident_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_staff() then
    return new;
  end if;

  -- Parceiro da empresa do chamado: pode repriorizar (status + prioridade),
  -- mas não mexer em responsável, solução ou empresa.
  if public.partner_company() is not null
     and old.company_id = public.partner_company()
     and old.kind = 'improvement' then
    if new.assigned_to is distinct from old.assigned_to
       or new.resolution is distinct from old.resolution
       or new.company_id is distinct from old.company_id then
      raise exception 'Parceiro só pode alterar status e prioridade da melhoria';
    end if;
    return new;
  end if;

  -- Demais não-equipe: sem alterar campos restritos.
  if new.status is distinct from old.status
     or new.assigned_to is distinct from old.assigned_to
     or new.resolution is distinct from old.resolution
     or new.priority is distinct from old.priority then
    raise exception 'Apenas a equipe de suporte pode alterar status, responsável, prioridade ou solução';
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- handle_new_user: aceitar papel 'partner' provisionado pelo admin + company_id.
-- (espelha a versão de 0006, adicionando o vínculo de empresa)
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
  v_company uuid;
begin
  select allowed_email_domain into v_domain from public.app_config where id = true;
  v_email_domain := lower(split_part(new.email, '@', 2));

  if v_domain is not null and v_domain <> '' and v_email_domain <> lower(v_domain) then
    raise exception 'Domínio de e-mail não autorizado: %', v_email_domain
      using errcode = 'check_violation';
  end if;

  select not exists (select 1 from public.profiles) into v_is_first;
  v_provisioned := coalesce(new.raw_user_meta_data->>'provisioned', '') = 'true';
  v_company := nullif(new.raw_user_meta_data->>'company_id', '')::uuid;

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

  insert into public.profiles (id, email, full_name, role, status, must_change_password, company_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_role,
    v_status,
    v_must,
    v_company
  );

  return new;
end;
$$;
