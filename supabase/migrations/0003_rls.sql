-- ============================================================================
-- Row Level Security — habilitado em todas as tabelas, deny-by-default.
-- Sem política = sem acesso. Cada política abaixo concede o mínimo necessário.
-- ============================================================================

alter table public.app_config            enable row level security;
alter table public.profiles              enable row level security;
alter table public.companies             enable row level security;
alter table public.systems               enable row level security;
alter table public.incidents             enable row level security;
alter table public.incident_comments     enable row level security;
alter table public.incident_attachments  enable row level security;

-- app_config: ninguém lê/escreve via API (só service role, que ignora RLS) ---
-- (nenhuma política → acesso negado para anon/authenticated)

-- profiles ------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
-- (a troca de papel é barrada pelo trigger guard_role_change)

-- companies -----------------------------------------------------------------
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select to authenticated using (true);

drop policy if exists companies_write on public.companies;
create policy companies_write on public.companies
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- systems -------------------------------------------------------------------
drop policy if exists systems_select on public.systems;
create policy systems_select on public.systems
  for select to authenticated using (true);

drop policy if exists systems_write on public.systems;
create policy systems_write on public.systems
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- incidents -----------------------------------------------------------------
drop policy if exists incidents_select on public.incidents;
create policy incidents_select on public.incidents
  for select to authenticated
  using (
    created_by = auth.uid()
    or public.is_staff()
    or status in ('resolved', 'closed')   -- base de conhecimento p/ todos
  );

drop policy if exists incidents_insert on public.incidents;
create policy incidents_insert on public.incidents
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists incidents_update on public.incidents;
create policy incidents_update on public.incidents
  for update to authenticated
  using (
    public.is_staff()
    or (created_by = auth.uid() and status = 'open')
  )
  with check (
    public.is_staff()
    or (created_by = auth.uid())
  );
-- (campos restritos protegidos pelo trigger guard_incident_fields)

drop policy if exists incidents_delete on public.incidents;
create policy incidents_delete on public.incidents
  for delete to authenticated using (public.is_admin());

-- incident_comments ---------------------------------------------------------
drop policy if exists comments_select on public.incident_comments;
create policy comments_select on public.incident_comments
  for select to authenticated
  using (public.can_view_incident(incident_id));

drop policy if exists comments_insert on public.incident_comments;
create policy comments_insert on public.incident_comments
  for insert to authenticated
  with check (author_id = auth.uid() and public.can_view_incident(incident_id));

drop policy if exists comments_modify on public.incident_comments;
create policy comments_modify on public.incident_comments
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists comments_delete on public.incident_comments;
create policy comments_delete on public.incident_comments
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- incident_attachments ------------------------------------------------------
drop policy if exists attachments_select on public.incident_attachments;
create policy attachments_select on public.incident_attachments
  for select to authenticated
  using (public.can_view_incident(incident_id));

drop policy if exists attachments_insert on public.incident_attachments;
create policy attachments_insert on public.incident_attachments
  for insert to authenticated
  with check (uploaded_by = auth.uid() and public.can_view_incident(incident_id));

drop policy if exists attachments_delete on public.incident_attachments;
create policy attachments_delete on public.incident_attachments
  for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_staff());
