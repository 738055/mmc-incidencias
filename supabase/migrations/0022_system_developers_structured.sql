-- ============================================================================
-- Desenvolvedores estruturados por sistema (nome + e-mail cada)
--   Substitui developer_emails text[] por developers jsonb:
--   [{ "name": "...", "email": "..." }, ...]. Cada chamado aceito notifica todos.
-- ============================================================================
alter table public.systems
  add column if not exists developers jsonb not null default '[]'::jsonb;

-- Backfill: cada e-mail antigo vira um dev sem nome.
update public.systems
  set developers = coalesce(
    (
      select jsonb_agg(jsonb_build_object('name', '', 'email', e))
      from unnest(developer_emails) as e
      where e is not null and e <> ''
    ),
    '[]'::jsonb
  )
  where developers = '[]'::jsonb
    and developer_emails is not null
    and array_length(developer_emails, 1) > 0;

alter table public.systems
  drop column if exists developer_emails;
