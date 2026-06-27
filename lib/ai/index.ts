import OpenAI, { toFile } from "openai";

/**
 * Modelo OpenAI usado para visão + texto. `gpt-4o-mini` é multimodal, rápido e
 * econômico; pode ser sobrescrito por OPENAI_MODEL (ex.: "gpt-4o").
 */
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * Modelo de embeddings. `text-embedding-3-small` suporta o parâmetro
 * `dimensions`, permitindo reduzir a saída para 1024 e casar com a coluna
 * `incidents.embedding vector(1024)`.
 */
const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

/** Dimensão dos embeddings — deve casar com `vector(1024)` no banco. */
export const EMBEDDING_DIM = 1024;

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

/**
 * Gera o embedding de um texto (busca semântica). Retorna null se a IA não
 * estiver configurada, o texto for vazio, ou em caso de erro.
 */
export async function embedText(text: string): Promise<number[] | null> {
  const client = getClient();
  const trimmed = text?.trim();
  if (!client || !trimmed) return null;

  try {
    const res = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: trimmed.slice(0, 8000),
      dimensions: EMBEDDING_DIM,
    });
    return res.data[0]?.embedding ?? null;
  } catch (err) {
    console.error("[ai] embedText:", err);
    return null;
  }
}

export interface SimilarIncident {
  ref: number;
  title: string;
  resolution: string | null;
}

export interface TutorialMatch {
  id?: string;
  title: string;
  content: string | null;
  category: string | null;
}

/** Limite de tamanho de áudio aceito pela transcrição da OpenAI (25 MB). */
export const TRANSCRIBE_MAX_BYTES = 25 * 1024 * 1024;

/**
 * Transcreve o áudio de um arquivo (vídeo MP4/WebM ou áudio) via OpenAI.
 * Retorna null se a IA não estiver configurada, o arquivo for grande demais
 * (>25 MB) ou em caso de erro. A transcrição é só de áudio (não "vê" a tela).
 */
export async function transcribeAudio(
  file: Blob,
  filename: string,
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  if (file.size > TRANSCRIBE_MAX_BYTES) return null;

  try {
    const res = await client.audio.transcriptions.create({
      model: process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1",
      file: await toFile(file, filename),
    });
    return res.text?.trim() || null;
  } catch (err) {
    console.error("[ai] transcribeAudio:", err);
    return null;
  }
}

/**
 * Analisa imagens anexadas (prints/erros) e descreve o problema observado.
 * Retorna null se a IA não estiver configurada ou em caso de erro.
 */
export async function analyzeIncidentImages(
  imageUrls: string[],
  context: { title: string; description: string },
): Promise<string | null> {
  const client = getClient();
  if (!client || imageUrls.length === 0) return null;

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            "Você é um analista de suporte técnico. Analise as imagens de erros/telas " +
            "anexadas a um chamado e descreva, em português objetivo, o que aparece " +
            "(mensagens de erro, telas, indícios da causa). Seja conciso e técnico.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Chamado: ${context.title}\n\nDescrição: ${context.description}\n\nAnalise as imagens anexadas:`,
            },
            ...imageUrls.slice(0, 5).map(
              (url) =>
                ({
                  type: "image_url",
                  image_url: { url },
                }) as const,
            ),
          ],
        },
      ],
    });

    return extractText(completion);
  } catch (err) {
    console.error("[ai] analyzeIncidentImages:", err);
    return null;
  }
}

/**
 * TRIAGEM unificada (1 só chamada à LLM). Combina o que antes eram duas chamadas
 * separadas (`suggestFromSimilar` + `suggestFromTutorials`): num único prompt,
 * avalia se a solicitação é DÚVIDA DE USO/PROCESSO (não defeito) — apontando o
 * tutorial — e/ou se um chamado resolvido parecido já resolve o caso — citando o
 * número (#ref). Retorna o texto pronto para o bloco de análise da IA, ou null
 * se a IA não estiver configurada / não houver nada útil.
 */
export async function triageIncident(
  current: { title: string; description: string },
  context: { similar: SimilarIncident[]; tutorials: TutorialMatch[] },
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const resolved = context.similar.filter((s) => s.resolution);
  if (resolved.length === 0 && context.tutorials.length === 0) return null;

  const tutorialsText = context.tutorials.length
    ? context.tutorials
        .map(
          (t) =>
            `• ${t.title}${t.category ? ` [${t.category}]` : ""}\n${(t.content ?? "").slice(0, 600)}`,
        )
        .join("\n\n")
    : "(nenhum tutorial relevante)";

  const similarText = resolved.length
    ? resolved
        .map((s) => `#${s.ref} — ${s.title}\nSolução: ${s.resolution}`)
        .join("\n\n")
    : "(nenhum chamado resolvido parecido)";

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            "Você faz a TRIAGEM de chamados do suporte da MMC. Com base nos TUTORIAIS e " +
            "nos CHAMADOS RESOLVIDOS parecidos, produza uma análise curta em português " +
            "do Brasil cobrindo, quando fizer sentido:\n" +
            "1) DÚVIDA DE USO vs DEFEITO — se o pedido for a pessoa não saber operar o " +
            "sistema (não um bug) e houver tutorial sobre o tema, deixe claro que " +
            "provavelmente NÃO é um defeito e cite o tutorial pelo título.\n" +
            "2) SOLUÇÃO REAPROVEITÁVEL — se algum chamado resolvido já resolve o caso, " +
            "resuma a solução citando o número (ex.: #968).\n" +
            "Use no máximo um parágrafo por item, com os rótulos. Não invente passos " +
            "fora do material. Se NADA for útil, responda exatamente 'SEM_SUGESTAO'.",
        },
        {
          role: "user",
          content:
            `SOLICITAÇÃO:\nTítulo: ${current.title}\nDescrição: ${current.description}\n\n` +
            `TUTORIAIS DISPONÍVEIS:\n${tutorialsText}\n\n` +
            `CHAMADOS RESOLVIDOS PARECIDOS:\n${similarText}`,
        },
      ],
    });

    const text = extractText(completion);
    if (!text || text.includes("SEM_SUGESTAO")) return null;
    return text;
  } catch (err) {
    console.error("[ai] triageIncident:", err);
    return null;
  }
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantContext {
  tutorials: { title: string; content: string | null; category: string | null }[];
  incidents: { ref: number; title: string; resolution: string | null }[];
}

/**
 * Responde a uma conversa do assistente (mascote da MMC) usando RAG: tutoriais e
 * soluções de chamados resolvidos passados como contexto. Foco em DÚVIDAS DE USO
 * / PROCESSO; se for um defeito, orienta a abrir um chamado. Retorna null se a IA
 * não estiver configurada ou em caso de erro.
 */
export async function assistantReply(
  turns: ChatTurn[],
  context: AssistantContext,
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const tutorialsText = context.tutorials.length
    ? context.tutorials
        .map(
          (t) =>
            `• ${t.title}${t.category ? ` [${t.category}]` : ""}\n${(t.content ?? "").slice(0, 800)}`,
        )
        .join("\n\n")
    : "(nenhum tutorial relevante encontrado)";

  const incidentsText = context.incidents.length
    ? context.incidents
        .map((i) => `#${i.ref} — ${i.title}\nSolução: ${i.resolution ?? ""}`)
        .join("\n\n")
    : "(nenhuma solução anterior relevante)";

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content:
            "Você é o assistente virtual de suporte da MMC — simpático, direto e em " +
            "português do Brasil. Ajude o usuário a resolver DÚVIDAS DE USO e de " +
            "PROCESSO usando os TUTORIAIS e as SOLUÇÕES anteriores fornecidos abaixo. " +
            "Regras: (1) se um tutorial cobrir o tema, explique o passo a passo e cite " +
            "o título do tutorial; (2) se parecer um DEFEITO do sistema (bug), diga que " +
            "o melhor é abrir um chamado em Incidências; (3) se não houver base " +
            "suficiente, seja honesto e sugira abrir um chamado; (4) seja conciso. " +
            "Nunca invente passos que não estejam no material.\n\n" +
            `TUTORIAIS:\n${tutorialsText}\n\nSOLUÇÕES ANTERIORES:\n${incidentsText}`,
        },
        ...turns.slice(-10).map((t) => ({
          role: t.role,
          content: t.content.slice(0, 2000),
        })),
      ],
    });

    return extractText(completion);
  } catch (err) {
    console.error("[ai] assistantReply:", err);
    return null;
  }
}

function extractText(
  completion: OpenAI.Chat.Completions.ChatCompletion,
): string | null {
  const text = completion.choices[0]?.message?.content?.trim();
  return text ? text : null;
}
