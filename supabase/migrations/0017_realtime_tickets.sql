-- ============================================================================
-- Realtime no detalhe do chamado: replica `incidents` e `incident_comments`
-- para que a tela de quem está olhando um chamado atualize ao vivo quando o
-- status/atribuição muda ou chega um novo comentário. O componente client
-- assina filtrado pelo id; o conteúdo exibido vem do server (RLS-protegido).
-- ============================================================================

do $$
begin
  alter publication supabase_realtime add table public.incidents;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.incident_comments;
exception
  when duplicate_object then null;
end $$;
