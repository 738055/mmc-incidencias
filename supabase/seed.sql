-- ============================================================================
-- Seed — dados iniciais. Rode após as migrações.
-- Ajuste o domínio de e-mail e os contatos das empresas conforme sua realidade.
-- ============================================================================

-- Domínio autorizado para AUTOCADASTRO (defesa em profundidade no banco).
-- Observação: convites feitos pelo admin aceitam QUALQUER domínio (parceiros e
-- terceirizados externos) — esta restrição vale só para quem se cadastra sozinho.
insert into public.app_config (id, allowed_email_domain)
values (true, 'mmcturismo.com.br')
on conflict (id) do update set allowed_email_domain = excluded.allowed_email_domain;

-- Empresas parceiras que atendem incidências.
insert into public.companies (name, slug, contact_emails, active) values
  ('Onasys',        'Onassis Filho',        array['onassisfilho@onasys.com.br'],     true),
  ('A4W', 'Alvaro Ojeda', array['alvaro@a4w.com.br'],  true),
  ('Inovacao e Tecnologia', 'Thomas William', array['inovacao@controladoriaturismo.com'],  true)
on conflict (slug) do nothing;

-- Catálogo de sistemas (exemplos).
insert into public.systems (name, description, active) values
  ('Site / E-commerce',   'Portal público e reservas online',      true),
  ('ERP / Backoffice',    'Gestão financeira e operacional',       true),
  ('CRM',                 'Relacionamento e atendimento',          true),
  ('Rede / Infraestrutura','Conectividade, VPN e servidores',      true),
  ('E-mail corporativo',  'Contas e distribuição de e-mail',       true)
on conflict do nothing;
