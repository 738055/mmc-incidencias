"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, GraduationCap } from "lucide-react";
import { MascotAvatar, type MascotState } from "@/components/mascot/mascot-avatar";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  tutorials?: { id: string; title: string }[];
};

const uid = () => Math.random().toString(36).slice(2);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AssistantChat({ firstName }: { firstName?: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "greet",
      role: "assistant",
      content: `Oi${firstName ? `, ${firstName}` : ""}! Sou o Bugzito, assistente da MMC. 🐛\nMe conte sua dúvida — vou procurar nos tutoriais e nas soluções já registradas. Se for um defeito do sistema, te oriento a abrir um chamado.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mascot, setMascot] = useState<MascotState>("idle");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    const userMsg: Msg = { id: uid(), role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);
    setMascot("thinking");

    try {
      const res = await fetch("/api/assistente", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      setLoading(false);

      const ok: boolean = data.ok !== false && res.ok;
      const answer: string = data.answer ?? "Não consegui responder agora.";
      const tutorials: { id: string; title: string }[] = data.tutorials ?? [];
      const id = uid();
      setMessages((m) => [...m, { id, role: "assistant", content: "", tutorials }]);

      // Revela o texto aos poucos (Bugzito fica "parado" exibindo a resposta).
      setMascot("idle");
      for (let i = 1; i <= answer.length; i += 2) {
        const slice = answer.slice(0, i);
        setMessages((m) => m.map((x) => (x.id === id ? { ...x, content: slice } : x)));
        await sleep(14);
      }
      setMessages((m) => m.map((x) => (x.id === id ? { ...x, content: answer } : x)));

      // Expressão final: triste se a IA não ajudou, confuso se não achou base.
      const finalState: MascotState = !ok
        ? "sad"
        : tutorials.length === 0
          ? "confused"
          : "idle";
      setMascot(finalState);
      await sleep(1800);
      setMascot("idle");
    } catch {
      setLoading(false);
      setMascot("error");
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          content: "Tive um problema para responder. Tente novamente.",
        },
      ]);
      await sleep(1800);
      setMascot("idle");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface">
      {/* Cabeçalho com o mascote */}
      <div className="flex items-center gap-3 border-b border-navy-600 bg-navy-700 px-5 py-4 text-white">
        <MascotAvatar state={mascot} size={56} />
        <div>
          <p className="font-semibold text-white">Bugzito</p>
          <p className="text-xs text-navy-100">
            {loading ? "pensando…" : "tire dúvidas de uso e processos"}
          </p>
        </div>
      </div>

      {/* Conversa */}
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                m.role === "user"
                  ? "rounded-tr-none bg-navy-700 text-white"
                  : "rounded-tl-none border border-border bg-surface-muted text-foreground",
              )}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.tutorials && m.tutorials.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.tutorials.map((t) => (
                    <Link
                      key={t.id}
                      href={`/tutoriais/${t.id}`}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-navy-700 ring-1 ring-inset ring-border hover:ring-navy-300"
                    >
                      <GraduationCap className="h-3.5 w-3.5" /> {t.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-border bg-surface-muted px-4 py-3">
              <span className="flex gap-1">
                <Dot /> <Dot delay="0.15s" /> <Dot delay="0.3s" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      {/* Entrada */}
      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t border-border bg-surface px-4 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte algo… ex.: como emito uma reserva?"
          className="h-11 flex-1 rounded-lg border border-border bg-surface-muted px-4 text-sm focus-visible:border-navy-600 focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="grid h-11 w-11 place-items-center rounded-lg bg-orange-700 text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}

function Dot({ delay = "0s" }: { delay?: string }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-navy-300"
      style={{ animationDelay: delay }}
    />
  );
}
