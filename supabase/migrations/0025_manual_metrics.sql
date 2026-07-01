-- ============================================================================
-- Métricas manuais (Bucket C) — indicadores que NÃO vêm de chamados
--   Ex.: integrações ativas, dashboards, aderência das equipes, redução de
--   retrabalho, horas economizadas, impacto em vendas/operações/atendimento.
--   O admin lança/atualiza; o dash de Indicadores exibe junto dos automáticos.
--   Modelo de "valor atual" (snapshot editável) + período/observação opcionais.
-- ============================================================================
create table if not exists public.manual_metrics (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  value numeric not null default 0,
  unit text,          -- ex.: %, h, un, R$
  period text,        -- ex.: "Junho/2026", "Q2 2026" (rótulo livre)
  note text,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.manual_metrics enable row level security;

-- Leitura: equipe (o dash é staff). Escrita: só admin.
drop policy if exists manual_metrics_select on public.manual_metrics;
create policy manual_metrics_select on public.manual_metrics
  for select to authenticated using (public.is_staff());

drop policy if exists manual_metrics_write on public.manual_metrics;
create policy manual_metrics_write on public.manual_metrics
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists manual_metrics_touch on public.manual_metrics;
create trigger manual_metrics_touch
  before update on public.manual_metrics
  for each row execute function public.touch_updated_at();
