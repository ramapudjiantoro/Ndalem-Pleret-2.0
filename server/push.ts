// ─── Ndalem Pleret — Web Push Service ────────────────────────────────────────
// Keys dibaca dari DB (adminConfig) agar bisa di-setup dari Admin Dashboard
// tanpa perlu menyentuh Railway Variables.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const webPush = require("web-push") as typeof import("web-push");

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
  email: string;
}

let _initialized = false;
let _cachedKeys: VapidKeys | null = null;

/** Inisialisasi web-push dengan keys yang diberikan. Dipanggil dari routes.ts. */
export function initPush(keys: VapidKeys): void {
  try {
    webPush.setVapidDetails(
      `mailto:${keys.email}`,
      keys.publicKey,
      keys.privateKey,
    );
    _initialized = true;
    _cachedKeys = keys;
    console.log("✅ Web Push initialized");
  } catch (err) {
    console.warn("⚠️  Web Push init failed:", err);
    _initialized = false;
  }
}

/** Apakah web push sudah dikonfigurasi dan siap digunakan? */
export function isPushReady(): boolean {
  return _initialized;
}

/** Public key yang sedang aktif (dikirim ke browser untuk subscribe). */
export function getPublicKey(): string | null {
  return _cachedKeys?.publicKey ?? null;
}

/**
 * Kirim push notification ke satu subscriber.
 * Return false jika endpoint sudah expired/invalid (harus dihapus dari DB).
 */
export async function sendPush(
  sub: PushSubscriptionData,
  payload: { title: string; body: string; tag?: string; requireInteraction?: boolean; url?: string },
): Promise<boolean> {
  if (!_initialized) return false;
  try {
    await webPush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 },
    );
    return true;
  } catch (err: any) {
    if (err?.statusCode === 410 || err?.statusCode === 404) return false;
    console.error("Push send error:", err?.message ?? err);
    return false;
  }
}

/**
 * Kirim push ke semua subscriber.
 * Return array endpoint yang expired (perlu dihapus dari DB).
 */
export async function sendPushToAll(
  subscriptions: PushSubscriptionData[],
  payload: { title: string; body: string; tag?: string; requireInteraction?: boolean; url?: string },
): Promise<string[]> {
  if (!_initialized || subscriptions.length === 0) return [];
  const expired: string[] = [];
  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const ok = await sendPush(sub, payload);
      if (!ok) expired.push(sub.endpoint);
    }),
  );
  return expired;
}
