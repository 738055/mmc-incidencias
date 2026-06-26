import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import {
  assistantReply,
  embedText,
  type ChatTurn,
} from "@/lib/ai";

type Body = { messages?: ChatTurn[] };

/**
 * Assistente de chat (RAG): embeda a pergunta, busca tutoriais + soluções
 * parecidas e responde com a OpenAI. Requer sessão autenticada.
 */
export async function POST(req: Request) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const turns = (body.messages ?? [])
    .filter(
      (m): m is ChatTurn =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string",
    )
    .slice(-12);

  const lastUser = [...turns].reverse().find((t) => t.role === "user");
  if (!lastUser) {
    return NextResponse.json({ error: "Sem pergunta." }, { status: 400 });
  }

  const supabase = await createClient();

  // RAG: busca semântica de tutoriais + soluções. Cai para full-text sem IA.
  const embedding = await embedText(lastUser.content);

  let tutorials: AssistantTutorial[] = [];
  let incidents: AssistantIncident[] = [];

  if (embedding) {
    const vec = `[${embedding.join(",")}]`;
    const [tut, inc] = await Promise.all([
      supabase.rpc("match_tutorials", {
        query_embedding: vec,
        match_count: 4,
        similarity_threshold: 0.3,
      }),
      supabase.rpc("match_incidents", {
        query_embedding: vec,
        match_count: 4,
        similarity_threshold: 0.3,
      }),
    ]);
    tutorials =
      tut.data?.map((t) => ({
        id: t.id,
        title: t.title,
        content: t.content,
        category: t.category,
      })) ?? [];
    incidents =
      inc.data?.map((i) => ({
        ref: i.ref,
        title: i.title,
        resolution: i.resolution,
      })) ?? [];
  }

  if (tutorials.length === 0) {
    const { data } = await supabase
      .from("tutorials")
      .select("id, title, content, category")
      .textSearch("search", lastUser.content, {
        type: "websearch",
        config: "portuguese",
      })
      .limit(4);
    tutorials =
      data?.map((t) => ({
        id: t.id,
        title: t.title,
        content: t.content,
        category: t.category,
      })) ?? [];
  }

  const answer = await assistantReply(turns, {
    tutorials: tutorials.map(({ title, content, category }) => ({
      title,
      content,
      category,
    })),
    incidents,
  });

  if (!answer) {
    return NextResponse.json({
      ok: false,
      answer:
        "No momento não consigo responder (a IA pode não estar configurada). " +
        "Você pode abrir um chamado em Incidências que a equipe ajuda.",
      tutorials: [],
    });
  }

  return NextResponse.json({
    ok: true,
    answer,
    // Tutoriais citados (para botões de atalho no chat).
    tutorials: tutorials.map((t) => ({ id: t.id, title: t.title })),
  });
}

type AssistantTutorial = {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
};
type AssistantIncident = {
  ref: number;
  title: string;
  resolution: string | null;
};
