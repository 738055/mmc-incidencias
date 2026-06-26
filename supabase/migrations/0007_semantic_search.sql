-- ============================================================================
-- Busca semântica (IA) — embeddings + pgvector
-- Requer a extensão `vector` (criada em 0001) e a coluna incidents.embedding.
-- Os embeddings são gerados pela OpenAI (text-embedding-3-small, 1024 dims) e
-- gravados pelo servidor (service role). Esta migração cria o índice ANN e a
-- função de busca por similaridade de cosseno.
-- ============================================================================

-- Índice ANN (HNSW) por distância de cosseno. Acelera a ordenação por <=>.
-- pgvector >= 0.5 (disponível no Supabase). Caso a versão seja antiga, troque
-- por ivfflat: using ivfflat (embedding vector_cosine_ops) with (lists = 100).
create index if not exists incidents_embedding_idx
  on public.incidents using hnsw (embedding vector_cosine_ops);

-- Retorna incidências da BASE DE CONHECIMENTO (resolvidas/fechadas, visíveis a
-- todos) semanticamente parecidas com o embedding consultado. SECURITY DEFINER:
-- não vaza dados restritos pois filtra apenas status público (resolved/closed).
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
    and i.status in ('resolved', 'closed')
    and (p_exclude_id is null or i.id <> p_exclude_id)
    and (1 - (i.embedding <=> query_embedding)) >= similarity_threshold
  order by i.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_incidents(vector, int, float, uuid)
  to authenticated;
