-- ============================================================================
-- Histórico de status por etapa (granularidade exata de tempo em cada estágio)
--   • um registro por transição (incl. a criação), gravado por TRIGGER — pega
--     todos os caminhos (kanban, detalhe, assumir, resolver, background) sem
--     instrumentar cada action.
--   • permite "tempo em cada etapa" e "parada há X" exato (sem aproximar por
--     updated_at, que muda com qualquer edição como prioridade/comentário).
-- ============================================================================

create table if not exists public.incident_status_history (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  status public.incident_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ish_incident_idx
  on public.incident_status_history (incident_id, created_at);

alter table public.incident_status_history enable row level security;

-- Leitura: quem pode ver o chamado vê o histórico (reusa can_view_incident,
-- que já contempla dono/equipe/parceiro/KB). Insert só pelo trigger.
drop policy if exists ish_select on public.incident_status_history;
create policy ish_select on public.incident_status_history
  for select to authenticated
  using (public.can_view_incident(incident_id));

-- Trigger: registra a etapa na criação e a cada mudança real de status.
create or replace function public.log_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.incident_status_history (incident_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.incident_status_history (incident_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_incident_status_history on public.incidents;
create trigger trg_incident_status_history
  after insert or update of status on public.incidents
  for each row execute function public.log_status_history();

-- Backfill (legado): 1 linha por chamado já existente com o status atual no
-- updated_at (aproximação só para os antigos; novas transições são exatas).
insert into public.incident_status_history (incident_id, status, created_at)
select i.id, i.status, coalesce(i.updated_at, i.created_at)
from public.incidents i
where not exists (
  select 1 from public.incident_status_history h where h.incident_id = i.id
);
