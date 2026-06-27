-- ============================================================================
-- Correção da base de conhecimento (KB): melhorias concluídas usam o status
-- `delivered` (não `resolved`/`closed`). A RPC `match_incidents` (0007) só
-- aceitava resolved/closed, então MELHORIAS ENTREGUES nunca entravam na busca
-- semântica. Recria a função incluindo `delivered`.
-- ============================================================================

create or replace function public.match_incidents(
  query_embedding vector(1024),
  match_count int default 5,
  similarity_threshold float default 0.3,
  p_exclude_id uuid default null
)
returns table (
  ref bigint,
  title text,
  resolution text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.ref,
    i.title,
    i.resolution,
    1 - (i.embedding <=> query_embedding) as similarity
  from public.incidents i
  where i.embedding is not null
    and i.status in ('resolved', 'closed', 'delivered')
    and (p_exclude_id is null or i.id <> p_exclude_id)
    and (1 - (i.embedding <=> query_embedding)) >= similarity_threshold
  order by i.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;
