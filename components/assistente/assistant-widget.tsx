"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { MascotAvatar } from "@/components/mascot/mascot-avatar";
import { AssistantChat } from "./chat";

/**
 * Bugzito flutuante: botão fixo no canto que abre o chat sobreposto, disponível
 * em qualquer página (sem trocar de tela). Montado no layout do app.
 */
export function AssistantWidget({ firstName }: { firstName?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex h-[70vh] max-h-[640px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[0_18px_45px_rgba(0,23,54,0.22)] sm:right-6">
          <AssistantChat firstName={firstName} />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fechar o Bugzito" : "Falar com o Bugzito"}
        className="fixed bottom-5 right-4 z-50 flex items-center gap-2 rounded-full bg-navy-700 py-1.5 pl-1.5 pr-4 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 sm:right-6"
      >
        {open ? (
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
            <X className="h-5 w-5" />
          </span>
        ) : (
          <MascotAvatar state="idle" size={40} className="rounded-full" />
        )}
        {open ? "Fechar" : "Bugzito"}
      </button>
    </>
  );
}
