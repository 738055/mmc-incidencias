-- ============================================================================
-- IA nos tutoriais: transcrição de áudio + embedding + busca semântica
-- Permite que, ao abrir um chamado, a IA cruze a solicitação com os tutoriais
-- e identifique quando "não é um defeito, é dúvida de uso / processo".
-- ============================================================================

alter table public.tutorials
  add column if not exists transcript text,             -- transcrição do áudio (Whisper)
  add column if not exists embedding vector(1024);      -- busca semântica (OpenAI)

-- Recria a coluna `search` para incluir a transcrição (idempotente: o DROP IF
-- EXISTS antes do ADD permite rodar de novo sem erro).
drop index if exists tutorials_search_idx;
alter table public.tutorials drop column if exists search;
alter table public.tutorials add column search tsvector generated always as (
  to_tsvector('portuguese',
    coalesce(title, '') || ' ' ||
    coalesce(content, '') || ' ' ||
    coalesce(category, '') || ' ' ||
    coalesce(transcript, ''))
) stored;
create index if not exists tutorials_search_idx on public.tutorials using gin (search);

create index if not exists tutorials_embedding_idx
  on public.tutorials using hnsw (embedding vector_cosine_ops);

-- Busca tutoriais publicados semanticamente parecidos com o embedding.
create or replace function public.match_tutorials(
  query_embedding vector(1024),
  match_count int default 4,
  similarity_threshold float default 0.3
)
returns table (
  id uuid,
  title text,
  content text,
  category text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.title,
    t.content,
    t.category,
    1 - (t.embedding <=> query_embedding) as similarity
  from public.tutorials t
  where t.embedding is not null
    and t.published
    and (1 - (t.embedding <=> query_embedding)) >= similarity_threshold
  order by t.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_tutorials(vector, int, float) to authenticated;
