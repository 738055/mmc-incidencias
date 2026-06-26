import OpenAI from "openai";

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
 * Gera uma sugestão "isto já foi resolvido antes" a partir de chamados parecidos.
 * Retorna null se a IA não estiver configurada ou não houver similares.
 */
export async function suggestFromSimilar(
  current: { title: string; description: string },
  similar: SimilarIncident[],
): Promise<string | null> {
  const client = getClient();
  if (!client || similar.length === 0) return null;

  const resolved = similar.filter((s) => s.resolution);
  if (resolved.length === 0) return null;

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content:
            "Você ajuda o suporte da MMC a reaproveitar soluções. Dado um novo problema " +
            "e chamados anteriores resolvidos parecidos, diga se algum resolve o caso atual " +
            "e resuma a solução, citando o número do chamado (ex.: #968). Se nada servir, " +
            "responda exatamente 'SEM_SUGESTAO'. Responda em português, curto e direto.",
        },
        {
          role: "user",
          content:
            `NOVO PROBLEMA:\nTítulo: ${current.title}\nDescrição: ${current.description}\n\n` +
            `CHAMADOS RESOLVIDOS PARECIDOS:\n` +
            resolved
              .map((s) => `#${s.ref} — ${s.title}\nSolução: ${s.resolution}`)
              .join("\n\n"),
        },
      ],
    });

    const text = extractText(completion);
    if (!text || text.includes("SEM_SUGESTAO")) return null;
    return text;
  } catch (err) {
    console.error("[ai] suggestFromSimilar:", err);
    return null;
  }
}

function extractText(
  completion: OpenAI.Chat.Completions.ChatCompletion,
): string | null {
  const text = completion.choices[0]?.message?.content?.trim();
  return text ? text : null;
}
