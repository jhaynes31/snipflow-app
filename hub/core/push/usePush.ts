"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { deviceLabel } from "@/convex/push/pure";

/**
 * Notifications on this device. The browser makes a push subscription for
 * this site; we keep it on the server under the signed-in person. Turning
 * it off here removes this device only. Nothing is asked for until the
 * person taps "Turn on".
 */
export interface PushState {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  /** This device's subscription endpoint, if the browser has one. */
  endpoint: string | null;
  checked: boolean;
}

function toKey(base64: string): BufferSource {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function usePush() {
  const publicKey = useQuery(api.push.subscriptions.publicKey);
  const devices = useQuery(api.push.subscriptions.mine);
  const save = useMutation(api.push.subscriptions.save);
  const remove = useMutation(api.push.subscriptions.remove);
  const [state, setState] = useState<PushState>({ supported: false, permission: "unsupported", endpoint: null, checked: false });

  useEffect(() => {
    let live = true;
    const look = async (): Promise<PushState> => {
      const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) return { supported: false, permission: "unsupported", endpoint: null, checked: true };
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      return { supported: true, permission: Notification.permission, endpoint: sub?.endpoint ?? null, checked: true };
    };
    look()
      .catch(() => ({ supported: false, permission: "unsupported" as const, endpoint: null, checked: true }))
      .then((s) => {
        if (live) setState(s);
      });
    return () => {
      live = false;
    };
  }, []);

  const onThisDevice = Boolean(state.endpoint && devices?.some((d) => d.endpoint === state.endpoint));
  const ready = publicKey !== undefined && devices !== undefined && state.checked;
  const serverReady = Boolean(publicKey);

  async function enable(): Promise<"on" | "denied" | "unsupported" | "notReady"> {
    if (!state.supported) return "unsupported";
    if (!publicKey) return "notReady";
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState((s) => ({ ...s, permission }));
      return "denied";
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) }));
    const json = sub.toJSON();
    await save({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "", label: deviceLabel(navigator.userAgent) });
    setState((s) => ({ ...s, permission: "granted", endpoint: sub.endpoint }));
    return "on";
  }

  async function disable(): Promise<void> {
    if (!state.supported) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await remove({ endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
    setState((s) => ({ ...s, endpoint: null }));
  }

  return { ...state, ready, serverReady, onThisDevice, devices: devices ?? [], enable, disable, removeDevice: (endpoint: string) => remove({ endpoint }) };
}
