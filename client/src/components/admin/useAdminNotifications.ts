import { useState, useRef, useEffect } from "react";
import type { Booking } from "./types";
import { adminFetch } from "./api";

// ─── Notification Types ───────────────────────────────────────────────────────
export interface AdminNotif {
  id: string;
  type: "new_booking" | "checkin" | "checkout";
  title: string;
  body: string;
  bookingRef?: string;
  at: Date;
  read: boolean;
}

export const NOTIF_ICON: Record<AdminNotif["type"], string> = {
  new_booking: "🔔", checkin: "🏠", checkout: "👋",
};

// ─── useAdminNotifications ────────────────────────────────────────────────────
const LS_SEEN   = "np_admin_seen_ids";   // persisted booking IDs already notified
const LS_KEYS   = "np_admin_notif_keys"; // { date, keys[] } — daily checkin/checkout dedup

function readSeenIds(): Set<number> {
  try {
    const raw = localStorage.getItem(LS_SEEN);
    return raw ? new Set<number>(JSON.parse(raw)) : new Set<number>();
  } catch { return new Set<number>(); }
}
function readNotifKeys(today: string): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEYS);
    if (!raw) return new Set<string>();
    const { date, keys } = JSON.parse(raw) as { date: string; keys: string[] };
    return date === today ? new Set<string>(keys) : new Set<string>(); // reset on new day
  } catch { return new Set<string>(); }
}
function saveSeenIds(ids: Set<number>) {
  try { localStorage.setItem(LS_SEEN, JSON.stringify([...ids])); } catch {}
}
function saveNotifKeys(today: string, keys: Set<string>) {
  try { localStorage.setItem(LS_KEYS, JSON.stringify({ date: today, keys: [...keys] })); } catch {}
}


// ─── Web Push helpers ─────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

async function registerWebPush(token: string): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    // Register service worker
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    // Ambil VAPID public key dari server
    const res = await adminFetch(token, "/api/admin/vapid-public-key");
    if (!res.ok) return;
    const { publicKey } = await res.json();
    if (!publicKey) return; // VAPID belum dikonfigurasi di server

    // Cek apakah sudah ada subscription yang aktif
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      // Sudah subscribe — pastikan tersimpan di DB (idempotent)
      const { endpoint, keys } = existing.toJSON() as any;
      await adminFetch(token, "/api/admin/push-subscribe", "POST", { endpoint, keys });
      return;
    }

    // Buat subscription baru
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const { endpoint, keys } = sub.toJSON() as any;
    await adminFetch(token, "/api/admin/push-subscribe", "POST", { endpoint, keys });
    console.log("✅ Push subscription registered");
  } catch (err) {
    console.warn("Push subscribe failed:", err);
  }
}

export function useAdminNotifications(bookings: Booking[], token: string) {
  const [notifs, setNotifs] = useState<AdminNotif[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  const today = new Date().toISOString().slice(0, 10);

  // Refs dipersist ke localStorage agar tidak reset saat halaman di-refresh
  const seenIds   = useRef<Set<number>>(readSeenIds());
  const notifKeys = useRef<Set<string>>(readNotifKeys(today));
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  async function requestPermission() {
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") {
      // Langsung daftarkan push subscription setelah izin diberikan
      await registerWebPush(token);
    }
    return p;
  }

  // Daftarkan push subscription saat hook pertama kali dipanggil (jika sudah granted)
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      registerWebPush(token);
    }
  }, [token]);

  function fire(notif: Omit<AdminNotif, "id" | "at" | "read">) {
    const id = Math.random().toString(36).slice(2) + Date.now();
    setNotifs((prev) => [{ ...notif, id, at: new Date(), read: false }, ...prev].slice(0, 60));

    // Hanya tampilkan system notification jika halaman sedang di background/hidden.
    // Jika halaman sedang aktif di depan, user sudah bisa lihat langsung — tidak perlu
    // notif duplikat (push sudah dikirim via service worker saat app di background).
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      try {
        const n = new Notification(notif.title, {
          body: notif.body,
          icon: "/favicon.ico",
          tag: notif.bookingRef ?? notif.type,
          requireInteraction: notif.type === "new_booking",
        });
        n.onclick = () => { window.focus(); n.close(); };
      } catch { /* Safari silent fail */ }
    }
  }

  useEffect(() => {
    if (bookings.length === 0) return;

    if (isFirstLoad.current) {
      isFirstLoad.current = false;

      // Tandai semua booking yang ada sebagai "sudah dilihat" — jangan notif
      let seenChanged = false;
      bookings.forEach((b) => {
        if (!seenIds.current.has(b.id)) {
          seenIds.current.add(b.id);
          seenChanged = true;
        }
      });
      if (seenChanged) saveSeenIds(seenIds.current);

      // Notif checkin/checkout HARI INI — hanya sekali per booking per hari
      // (notifKeys sudah diisi dari localStorage, jadi skip kalau sudah pernah)
      let keysChanged = false;
      bookings.forEach((b) => {
        if (b.status === "cancelled") return;
        if (b.checkIn.slice(0, 10) === today) {
          const key = `ci-${b.bookingRef}`;
          if (!notifKeys.current.has(key)) {
            notifKeys.current.add(key);
            keysChanged = true;
            fire({ type: "checkin", title: "🏠 Check-in Hari Ini",
              body: `${b.guestName} (${b.bookingRef}) check-in di ${b.unitName}`,
              bookingRef: b.bookingRef });
          }
        }
        if (b.checkOut.slice(0, 10) === today) {
          const key = `co-${b.bookingRef}`;
          if (!notifKeys.current.has(key)) {
            notifKeys.current.add(key);
            keysChanged = true;
            fire({ type: "checkout", title: "👋 Check-out Hari Ini",
              body: `${b.guestName} (${b.bookingRef}) check-out dari ${b.unitName}`,
              bookingRef: b.bookingRef });
          }
        }
      });
      if (keysChanged) saveNotifKeys(today, notifKeys.current);
      return;
    }

    // Polling berikutnya: deteksi booking BARU saja
    let seenChanged = false;
    bookings.forEach((b) => {
      if (!seenIds.current.has(b.id)) {
        seenIds.current.add(b.id);
        seenChanged = true;
        fire({
          type: "new_booking",
          title: "🔔 Pesanan Baru!",
          body: `${b.guestName} memesan ${b.unitName} · ${b.checkIn.slice(0,10)} → ${b.checkOut.slice(0,10)} · ${b.nights} malam`,
          bookingRef: b.bookingRef,
        });
      }
    });
    if (seenChanged) saveSeenIds(seenIds.current);
  }, [bookings]);

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }
  // clearAll hanya hapus tampilan panel — tidak reset localStorage
  // (kalau direset, refresh berikutnya akan notif ulang lagi)
  function clearAll() { setNotifs([]); }

  const unread = notifs.filter((n) => !n.read).length;
  return { notifs, unread, permission, requestPermission, markAllRead, clearAll };
}
