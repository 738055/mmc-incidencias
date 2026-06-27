-- ============================================================================
-- Aprendizado da IA por feedback da equipe.
-- Ao abrir um chamado, a IA registra em `incidents.ai_suggested_refs` quais
-- chamados resolvidos (refs) embasaram a sugestão. A equipe avalia a sugestão
-- (👍/👎) em `ai_suggestion_feedback`. A função `unhelpful_refs()` devolve as
-- soluções repetidamente rejeitadas para que a triagem PARE de sugeri-las.
-- ============================================================================

-- Refs dos chamados resolvidos citados na sugestão de IA do chamado.
alter table public.incidents
  add column if not exists ai_suggested_refs bigint[];

create table if not exists public.ai_suggestion_feedback (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  helpful boolean not null,
  created_at timestamptz not null default now(),
  unique (incident_id, user_id)            -- um voto por pessoa por chamado
);

create index if not exists ai_feedback_incident_idx
  on public.ai_suggestion_feedback (incident_id);

alter table public.ai_suggestion_feedback enable row level security;

-- Só a equipe (technician/admin) lê e vota. Reusa o helper is_staff() do projeto.
drop policy if exists ai_feedback_select on public.ai_suggestion_feedback;
create policy ai_feedback_select on public.ai_suggestion_feedback
  for select to authenticated
  using (public.is_staff());

drop policy if exists ai_feedback_insert on public.ai_suggestion_feedback;
create policy ai_feedback_insert on public.ai_suggestion_feedback
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_staff());

drop policy if exists ai_feedback_update on public.ai_suggestion_feedback;
create policy ai_feedback_update on public.ai_suggestion_feedback
  for update to authenticated
  using (user_id = auth.uid() and public.is_staff())
  with check (user_id = auth.uid() and public.is_staff());

-- Soluções (refs) cujas sugestões foram, no geral, MAIS rejeitadas que aceitas
-- (e rejeitadas ao menos 2x): a triagem deixa de oferecê-las. Aprende com o uso.
create or replace function public.unhelpful_refs()
returns table (ref bigint)
language sql
stable
security definer
set search_path = public
as $$
  select r.ref
  from public.ai_suggestion_feedback f
  join public.incidents i on i.id = f.incident_id
  cross join unnest(coalesce(i.ai_suggested_refs, '{}'::bigint[])) as r(ref)
  group by r.ref
  having count(*) filter (where not f.helpful) > count(*) filter (where f.helpful)
     and count(*) filter (where not f.helpful) >= 2;
$$;

grant execute on function public.unhelpful_refs() to authenticated;
