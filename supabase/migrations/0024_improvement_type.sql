-- ============================================================================
-- Tipo da melhoria: melhoria | automação | projeto
--   Subcategoria das solicitações kind='improvement'. Habilita indicadores
--   separados (nº de automações, projetos em andamento/concluídos). NULL = bug
--   ou melhoria sem tipo (tratada como 'improvement').
-- ============================================================================
alter table public.incidents
  add column if not exists improvement_type text
  check (improvement_type in ('improvement', 'automation', 'project'));
