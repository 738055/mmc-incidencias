-- ============================================================================
-- Funções e triggers
-- ============================================================================

-- Helpers de papel (SECURITY DEFINER p/ evitar recursão de RLS em profiles) --
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('technician', 'admin')
  );
$$;

-- Pode ver a incidência? (dono, equipe, ou base de conhecimento) ------------
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
        or i.status in ('resolved', 'closed')   -- base de conhecimento
      )
  );
$$;

-- updated_at automático ------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_incidents_touch on public.incidents;
create trigger trg_incidents_touch before update on public.incidents
  for each row execute function public.touch_updated_at();

-- Marca resolved_at quando vira 'resolved' -----------------------------------
create or replace function public.set_resolved_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'resolved' and (old.status is distinct from 'resolved') then
    new.resolved_at = now();
  elsif new.status <> 'resolved' then
    new.resolved_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_incidents_resolved on public.incidents;
create trigger trg_incidents_resolved before update on public.incidents
  for each row execute function public.set_resolved_at();

-- Criação de perfil no signup + restrição de domínio -------------------------
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
begin
  select allowed_email_domain into v_domain from public.app_config where id = true;
  v_email_domain := lower(split_part(new.email, '@', 2));

  -- Defesa em profundidade: bloqueia domínios não autorizados.
  if v_domain is not null and v_domain <> '' and v_email_domain <> lower(v_domain) then
    raise exception 'Domínio de e-mail não autorizado: %', v_email_domain
      using errcode = 'check_violation';
  end if;

  -- O primeiro usuário do sistema vira administrador.
  select not exists (select 1 from public.profiles) into v_is_first;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when v_is_first then 'admin'::public.user_role else 'requester'::public.user_role end
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impede que não-admin altere o próprio papel (escalonamento) -----------------
create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Apenas administradores podem alterar papéis de usuário';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_role on public.profiles;
create trigger trg_profiles_guard_role before update on public.profiles
  for each row execute function public.guard_role_change();

-- Impede que não-equipe altere campos restritos da incidência ----------------
create or replace function public.guard_incident_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    if new.status is distinct from old.status
       or new.assigned_to is distinct from old.assigned_to
       or new.resolution is distinct from old.resolution
       or new.priority is distinct from old.priority then
      raise exception 'Apenas a equipe de suporte pode alterar status, responsável, prioridade ou solução';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_incidents_guard on public.incidents;
create trigger trg_incidents_guard before update on public.incidents
  for each row execute function public.guard_incident_fields();
