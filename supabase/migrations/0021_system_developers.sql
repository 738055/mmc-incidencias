-- ============================================================================
-- Múltiplos desenvolvedores por sistema
--   Substitui o e-mail único (developer_email) por uma lista (developer_emails),
--   espelhando companies.contact_emails. Cada chamado aceito notifica TODOS.
--   O nome cosmético (developer_name) deixa de existir.
-- ============================================================================
alter table public.systems
  add column if not exists developer_emails text[] not null default '{}';

-- Backfill: traz o e-mail único existente para a lista.
update public.systems
  set developer_emails = array[developer_email]
  where developer_email is not null
    and developer_email <> ''
    and developer_emails = '{}';

alter table public.systems
  drop column if exists developer_email,
  drop column if exists developer_name;
