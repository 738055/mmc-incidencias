-- ============================================================================
-- Realtime in-app: habilita a replicação da tabela `notifications` para que o
-- sininho (componente client) receba INSERTs ao vivo via Supabase Realtime.
-- A RLS já restringe cada usuário às próprias notificações, então o canal só
-- entrega o que o usuário pode ler (filtro user_id no client + RLS no servidor).
-- ============================================================================

-- `add table` falha se a tabela já estiver na publicação; o bloco torna idempotente.
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;
