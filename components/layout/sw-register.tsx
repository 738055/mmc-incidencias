"use client";

import { useEffect } from "react";

/** Registra o service worker (Web Push) uma vez, ao carregar o app. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("[sw] register:", err);
      });
    }
  }, []);
  return null;
}
