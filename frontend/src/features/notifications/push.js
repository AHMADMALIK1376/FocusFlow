// Browser side of phone/desktop push notifications.
import { notifyAPI } from "../../services/api";

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("Service worker registration failed:", e));
  });
}

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js").then(() => navigator.serviceWorker.ready);
}

// 'unsupported' | 'denied' | 'on' | 'off'
export async function pushStatus() {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await registration();
  const sub = await reg.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

export async function enablePush(vapidPublicKey) {
  if (!pushSupported()) throw new Error("This browser can't show notifications.");
  if (!vapidPublicKey) throw new Error("Notifications aren't configured on the server.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications are blocked. Allow them in your browser's site settings.");
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) });
  }
  await notifyAPI.subscribe(sub.toJSON());
}

export async function disablePush() {
  if (!pushSupported()) return;
  const reg = await registration();
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await notifyAPI.unsubscribe(sub.endpoint).catch(() => {});
    await sub.unsubscribe();
  }
}
