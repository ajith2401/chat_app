// Browser Web Push helpers: register the service worker, subscribe to push,
// and sync the subscription with the backend.
import api from "./api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function getNotificationStatus(): Promise<"unsupported" | "granted" | "denied" | "default"> {
  if (!pushSupported()) return "unsupported";
  return Notification.permission as "granted" | "denied" | "default";
}

export async function isSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return !!sub;
}

/** Request permission, subscribe, and register with the backend. Returns true on success. */
export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) throw new Error("Notifications aren't supported on this browser");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const { data } = await api.get("/notifications/vapid-public-key");
  if (!data?.enabled || !data?.publicKey) throw new Error("Push is not configured on the server");

  const reg = (await navigator.serviceWorker.getRegistration()) || (await registerServiceWorker());
  if (!reg) throw new Error("Service worker unavailable");
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey) as BufferSource,
    }));

  await api.post("/notifications/subscribe", sub.toJSON());
  return true;
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api.post("/notifications/unsubscribe", { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
}
