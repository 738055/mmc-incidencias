-- ============================================================================
-- Assistente (Bugzito): para linkar o chamado resolvido correspondente na
-- resposta, a RPC `match_incidents` passa a devolver também `id` (UUID) e `kind`
-- (incident|improvement), permitindo montar a URL /incidencias/<id> ou
-- /melhorias/<id>. Mudar as colunas de saída exige DROP antes do CREATE.
-- ============================================================================

drop function if exists public.match_incidents(vector, int, float, uuid);

create or replace function public.match_incidents(
  query_embedding vector(1024),
  match_count int default 5,
  similarity_threshold float default 0.3,
  p_exclude_id uuid default null
)
returns table (
  id uuid,
  ref bigint,
  title text,
  resolution text,
  kind text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id,
    i.ref,
    i.title,
    i.resolution,
    i.kind,
    1 - (i.embedding <=> query_embedding) as similarity
  from public.incidents i
  where i.embedding is not null
    and i.status in ('resolved', 'closed', 'delivered')
    and (p_exclude_id is null or i.id <> p_exclude_id)
    and (1 - (i.embedding <=> query_embedding)) >= similarity_threshold
  order by i.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_incidents(vector, int, float, uuid)
  to authenticated;
