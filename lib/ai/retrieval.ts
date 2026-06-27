import type { createClient } from "@/lib/supabase/server";
import { embedText, type SimilarIncident, type TutorialMatch } from "./index";

/**
 * Recuperação RAG compartilhada pela criação de chamados e pelo assistente:
 * embeda a consulta, busca chamados resolvidos parecidos (`match_incidents`) e
 * tutoriais relevantes (`match_tutorials`), com fallback full-text (português).
 *
 * Aprendizado: chamados cujas soluções foram repetidamente rejeitadas pela
 * equipe (RPC `unhelpful_refs`) deixam de ser sugeridos — a triagem melhora com
 * o uso, sem re-treino.
 */

type DB = Awaited<ReturnType<typeof createClient>>;

export type RetrievedContext = {
  embedding: number[] | null;
  incidents: SimilarIncident[];
  tutorials: TutorialMatch[];
};

export async function retrieveContext(
  supabase: DB,
  query: string,
  opts: { excludeId?: string; ftsQuery?: string } = {},
): Promise<RetrievedContext> {
  const embedding = await embedText(query);
  const fts = opts.ftsQuery ?? query;
  const [incidents, tutorials] = await Promise.all([
    findSimilarIncidents(supabase, embedding, fts, opts.excludeId),
    findTutorials(supabase, embedding, fts),
  ]);
  return { embedding, incidents, tutorials };
}

async function findSimilarIncidents(
  supabase: DB,
  embedding: number[] | null,
  ftsQuery: string,
  excludeId?: string,
): Promise<SimilarIncident[]> {
  let candidates: SimilarIncident[] = [];

  if (embedding) {
    const { data, error } = await supabase.rpc("match_incidents", {
      query_embedding: `[${embedding.join(",")}]`,
      match_count: 6,
      similarity_threshold: 0.3,
      p_exclude_id: excludeId ?? null,
    });
    if (!error && data && data.length > 0) {
      candidates = data.map((d) => ({
        id: d.id,
        ref: d.ref,
        title: d.title,
        resolution: d.resolution,
        kind: d.kind,
      }));
    }
  }

  if (candidates.length === 0) {
    const { data } = await supabase
      .from("incidents")
      .select("id, ref, title, resolution, kind")
      .in("status", ["resolved", "closed", "delivered"])
      .textSearch("search", ftsQuery, { type: "websearch", config: "portuguese" })
      .limit(6);
    candidates = data ?? [];
  }

  // Aprendizado: remove soluções que a equipe vem rejeitando.
  const bad = await unhelpfulRefs(supabase);
  const filtered = bad.size
    ? candidates.filter((c) => !bad.has(c.ref))
    : candidates;
  return filtered.slice(0, 5);
}

async function findTutorials(
  supabase: DB,
  embedding: number[] | null,
  ftsQuery: string,
): Promise<TutorialMatch[]> {
  if (embedding) {
    const { data, error } = await supabase.rpc("match_tutorials", {
      query_embedding: `[${embedding.join(",")}]`,
      match_count: 4,
      similarity_threshold: 0.35,
    });
    if (!error && data && data.length > 0) {
      return data.map((d) => ({
        id: d.id,
        title: d.title,
        content: d.content,
        category: d.category,
      }));
    }
  }
  const { data } = await supabase
    .from("tutorials")
    .select("id, title, content, category")
    .textSearch("search", ftsQuery, { type: "websearch", config: "portuguese" })
    .limit(4);
  return data ?? [];
}

/** Refs rejeitadas pela equipe (feedback 👎 predominante). Tolerante a falhas. */
async function unhelpfulRefs(supabase: DB): Promise<Set<number>> {
  try {
    const { data, error } = await supabase.rpc("unhelpful_refs");
    if (error || !data) return new Set();
    return new Set(data.map((r) => r.ref));
  } catch {
    return new Set();
  }
}
