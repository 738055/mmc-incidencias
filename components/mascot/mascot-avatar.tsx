"use client";

import { useState } from "react";
import { Bug } from "lucide-react";
import { cn } from "@/lib/utils";

/** Expressões do Bugzito (mascote da IA). Cada uma tem um clipe de vídeo. */
export type MascotState = "idle" | "thinking" | "confused" | "error" | "sad";

const STATES: MascotState[] = ["idle", "thinking", "confused", "error", "sad"];

/**
 * Avatar animado da IA — o Bugzito. Empilha um clipe de vídeo por expressão e
 * troca via opacidade — instantâneo, sem flash. Os clipes ficam em
 * `public/mascot/<estado>.webm` (preferível, com alpha) e/ou `.mp4`.
 *
 * Enquanto os vídeos não existem (ou falham ao carregar), mostra um fallback
 * animado por CSS, então a tela funciona normalmente sem os assets.
 */
export function MascotAvatar({
  state = "idle",
  size = 96,
  className,
}: {
  state?: MascotState;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-2xl bg-navy-700 shadow-md",
        className,
      )}
      style={{ width: size, height: size }}
      aria-label="Bugzito — assistente MMC"
    >
      {/* Base: fallback sempre por baixo. Um clipe ativo o cobre por completo;
          se o vídeo faltar/falhar, o fallback aparece automaticamente. */}
      <MascotFallback state={state} />

      {STATES.map((s) => (
        <video
          key={s}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onError={() => setFailed((f) => ({ ...f, [s]: true }))}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          style={{ opacity: s === state && failed[s] !== true ? 1 : 0 }}
        >
          <source src={`/mascot/${s}.webm`} type="video/webm" />
          <source src={`/mascot/${s}.mp4`} type="video/mp4" />
        </video>
      ))}
    </div>
  );
}

function MascotFallback({ state }: { state: MascotState }) {
  const anim =
    state === "thinking"
      ? "animate-pulse"
      : state === "confused"
        ? "animate-pulse"
        : state === "error"
          ? "text-red-200"
          : state === "sad"
            ? "opacity-60"
            : "";
  return (
    <div className="absolute inset-0 grid place-items-center brand-gradient">
      <Bug className={cn("h-1/2 w-1/2 text-white/90 transition-all", anim)} />
      {state === "thinking" && (
        <span className="absolute bottom-2 flex gap-1">
          <Dot /> <Dot delay="0.15s" /> <Dot delay="0.3s" />
        </span>
      )}
    </div>
  );
}

function Dot({ delay = "0s" }: { delay?: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/80"
      style={{ animationDelay: delay }}
    />
  );
}
