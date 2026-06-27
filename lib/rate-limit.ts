/**
 * Rate limit simples de janela fixa, em memória. Conta requisições por chave
 * (ex.: usuário) dentro de uma janela. Suficiente para conter loops/abuso e
 * proteger o custo da OpenAI no assistente.
 *
 * Limitação: o estado é por instância do servidor (serverless = não global).
 * Uma instância "quente" segura rajadas; para um limite global use Upstash/Redis.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    // Limpeza oportunista para o mapa não crescer indefinidamente.
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, retryAfter: 0 };
}
