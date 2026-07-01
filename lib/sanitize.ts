import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Sanitiza o HTML vindo do editor de texto rico (rich text) antes de gravar.
 * Deny-by-default: só as tags/atributos abaixo passam — barra <script>, estilos
 * inline, event handlers, iframes, etc. Chamado no servidor (Server Actions),
 * então o que é persistido já está limpo (defesa contra XSS armazenado).
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "b", "strong", "i", "em", "u", "s", "strike",
    "ul", "ol", "li", "h1", "h2", "h3", "blockquote", "a", "code", "pre",
  ],
  allowedAttributes: { a: ["href"] },
  allowedSchemes: ["http", "https", "mailto"],
  // Links sempre abrem em nova aba e sem vazar o referrer.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      target: "_blank",
      rel: "noopener noreferrer",
    }),
  },
};

export function sanitizeRichText(dirty: string): string {
  return sanitizeHtml(dirty ?? "", OPTIONS).trim();
}

/** Texto puro (sem tags) — para validar "vazio" e alimentar a IA/embedding. */
export function htmlToText(html: string): string {
  return sanitizeHtml(html ?? "", { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}
