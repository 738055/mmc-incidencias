-- ============================================================================
-- Vínculo Sistema → Empresa responsável
--   Cada sistema pode ter uma empresa (dev/parceira) responsável. Ao abrir
--   chamado ou melhoria, selecionar o sistema já sugere essa empresa no form.
--   on delete set null: apagar a empresa não apaga o sistema.
-- ============================================================================
alter table public.systems
  add column if not exists company_id uuid references public.companies (id) on delete set null;
