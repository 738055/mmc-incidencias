import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { assistantReply, type ChatTurn } from "@/lib/ai";
import { retrieveContext } from "@/lib/ai/retrieval";
import { rateLimit } from "@/lib/rate-limit";

type Body = { messages?: ChatTurn[] };

/** Limite por usuário: protege o custo da OpenAI contra loops/abuso. */
const RATE_LIMIT = 15; // mensagens
const RATE_WINDOW_MS = 60_000; // por minuto

/**
 * Assistente de chat (RAG): embeda a pergunta, busca tutoriais + soluções
 * parecidas e responde com a OpenAI. Requer sessão autenticada.
 */
export async function POST(req: Request) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const rl = rateLimit(`assistant:${profile.id}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        answer: `Você está enviando mensagens rápido demais. Tente novamente em ${rl.retryAfter}s.`,
        tutorials: [],
        incidents: [],
      },
      { status: 429 },
    );
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

  // RAG compartilhado: busca semântica de tutoriais + soluções (fallback FTS) e
  // aprende com o feedback (soluções rejeitadas deixam de aparecer).
  const { tutorials, incidents } = await retrieveContext(
    supabase,
    lastUser.content,
  );

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
    // Chamados resolvidos correspondentes (link "veja a solução" + "isso ajudou?").
    incidents: incidents
      .filter((i) => i.id && i.resolution)
      .map((i) => ({
        id: i.id,
        ref: i.ref,
        title: i.title,
        kind: i.kind ?? "incident",
      })),
  });
}
