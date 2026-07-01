-- ============================================================================
-- Departamentos (setores internos) + vínculo de usuários e chamados
--   Permite métricas por departamento: quem mais pede melhorias, tem bugs, etc.
--   incidents.department_id é um SNAPSHOT (departamento de quem abriu no momento
--   da criação) — mantém o histórico correto mesmo se a pessoa mudar de setor.
-- ============================================================================
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.departments enable row level security;

drop policy if exists departments_select on public.departments;
create policy departments_select on public.departments
  for select to authenticated using (true);

drop policy if exists departments_write on public.departments;
create policy departments_write on public.departments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.profiles
  add column if not exists department_id uuid references public.departments (id) on delete set null;

alter table public.incidents
  add column if not exists department_id uuid references public.departments (id) on delete set null;
