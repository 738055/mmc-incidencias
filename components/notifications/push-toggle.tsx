"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribePushAction, unsubscribePushAction } from "@/app/(app)/perfil/push-actions";

/** Converte a chave VAPID (base64url) no formato que o PushManager espera. */
function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

type State = "loading" | "unsupported" | "off" | "on" | "denied" | "no-key";

export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let cancelled = false;
    async function detect(): Promise<State> {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
      if (!vapidKey) return "no-key";
      if (Notification.permission === "denied") return "denied";
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        return sub ? "on" : "off";
      } catch {
        return "off";
      }
    }
    detect().then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, [vapidKey]);

  async function enable() {
    if (!vapidKey) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg =
        (await navigator.serviceWorker.getRegistration("/sw.js")) ??
        (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(vapidKey),
      });
      const json = sub.toJSON();
      const res = await subscribePushAction({
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
      });
      setState(res.ok ? "on" : "off");
    } catch (err) {
      console.error("[push] enable:", err);
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribePushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch (err) {
      console.error("[push] disable:", err);
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;

  const messages: Record<Exclude<State, "loading">, string> = {
    unsupported: "Seu navegador não suporta notificações push.",
    denied: "Notificações bloqueadas. Libere nas permissões do navegador para ativar.",
    "no-key": "Web Push não configurado pelo administrador (chave VAPID ausente).",
    off: "Receba avisos de novos chamados, comentários e atualizações neste dispositivo.",
    on: "Notificações ativas neste dispositivo.",
  };

  return (
    <div className="space-y-3 border-t border-border pt-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-500/10 text-orange-600">
          {state === "on" ? <BellRing className="h-[18px] w-[18px]" /> : <Bell className="h-[18px] w-[18px]" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Notificações no dispositivo</p>
          <p className="mt-0.5 text-sm text-muted">{messages[state]}</p>
        </div>
      </div>

      {state === "off" && (
        <Button type="button" onClick={enable} disabled={busy} variant="accent">
          <Bell className="h-4 w-4" /> {busy ? "Ativando..." : "Ativar notificações"}
        </Button>
      )}
      {state === "on" && (
        <Button type="button" onClick={disable} disabled={busy} variant="outline">
          <BellOff className="h-4 w-4" /> {busy ? "Desativando..." : "Desativar neste dispositivo"}
        </Button>
      )}
    </div>
  );
}
