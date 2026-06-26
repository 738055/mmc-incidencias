-- ============================================================================
-- Tipo "Melhorias & Desenvolvimento"
-- Estende a base de incidências com um segundo tipo de solicitação (kind),
-- novos status de fluxo de evolução de sistemas e campos de negócio.
-- ============================================================================

-- Novos status (fluxo de melhorias). IF NOT EXISTS torna a migração idempotente.
alter type public.incident_status add value if not exists 'requested';
alter type public.incident_status add value if not exists 'in_analysis';
alter type public.incident_status add value if not exists 'approved';
alter type public.incident_status add value if not exists 'in_development';
alter type public.incident_status add value if not exists 'delivered';
alter type public.incident_status add value if not exists 'rejected';

-- Tipo de solicitação
do $$ begin
  create type public.ticket_kind as enum ('incident', 'improvement');
exception when duplicate_object then null; end $$;

-- Colunas: tipo + campos de negócio das melhorias
alter table public.incidents
  add column if not exists kind public.ticket_kind not null default 'incident',
  add column if not exists stakeholder_area text,
  add column if not exists benefit text;

create index if not exists incidents_kind_idx on public.incidents (kind);

-- resolved_at agora também marca a "entrega" de melhorias (delivered)
create or replace function public.set_resolved_at()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('resolved', 'delivered')
     and (old.status is distinct from new.status) then
    new.resolved_at = now();
  elsif new.status not in ('resolved', 'delivered') then
    new.resolved_at = null;
  end if;
  return new;
end;
$$;
