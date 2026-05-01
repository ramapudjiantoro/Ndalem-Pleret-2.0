import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Lock, LogOut, RefreshCw, Check, X, Banknote, Calendar, User,
  Phone, Mail, BedDouble, ChevronDown, ChevronUp, Plus, Trash2,
  AlertTriangle, Eye, EyeOff, ChevronLeft, ChevronRight,
  StickyNote, Pencil, Download, FileText, FileSpreadsheet, Printer, Filter,
  Bell, BellRing, KeyRound,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatIDR } from "@/hooks/use-units";
import { getDaysInMonth, addMonths, isBefore, isToday, format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Booking {
  id: number; bookingRef: string; unitId: number; unitName: string;
  guestName: string; guestPhone: string; guestEmail: string;
  checkIn: string; checkOut: string; nights: number; totalPrice: number;
  status: string; paymentStatus: string; guestCount: number; notes?: string; adminNotes?: string;
  createdAt: string;
}
interface BlockedDate { id: number; unitId: number; date: string; reason?: string; }

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40",
  confirmed: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/40",
  cancelled: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/40",
};
const PAYMENT_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-600/40",
  paid: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu", confirmed: "Dikonfirmasi", cancelled: "Dibatalkan",
};
const PAYMENT_LABELS: Record<string, string> = {
  pending: "Belum Bayar", paid: "Sudah Bayar",
};

// ─── Notification Types ───────────────────────────────────────────────────────
interface AdminNotif {
  id: string;
  type: "new_booking" | "checkin" | "checkout";
  title: string;
  body: string;
  bookingRef?: string;
  at: Date;
  read: boolean;
}

const NOTIF_ICON: Record<AdminNotif["type"], string> = {
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
    const res = await fetch("/api/admin/vapid-public-key", {
      headers: { "x-admin-token": token },
    });
    if (!res.ok) return;
    const { publicKey } = await res.json();
    if (!publicKey) return; // VAPID belum dikonfigurasi di server

    // Cek apakah sudah ada subscription yang aktif
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      // Sudah subscribe — pastikan tersimpan di DB (idempotent)
      const { endpoint, keys } = existing.toJSON() as any;
      await fetch("/api/admin/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ endpoint, keys }),
      });
      return;
    }

    // Buat subscription baru
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const { endpoint, keys } = sub.toJSON() as any;
    await fetch("/api/admin/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ endpoint, keys }),
    });
    console.log("✅ Push subscription registered");
  } catch (err) {
    console.warn("Push subscribe failed:", err);
  }
}

function useAdminNotifications(bookings: Booking[], token: string) {
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

    if ("Notification" in window && Notification.permission === "granted") {
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

// ─── NotifPanel ───────────────────────────────────────────────────────────────
function NotifPanel({
  notifs, unread, permission,
  onRequestPermission, onMarkAllRead, onClearAll, onClose,
}: {
  notifs: AdminNotif[]; unread: number; permission: NotificationPermission;
  onRequestPermission: () => void; onMarkAllRead: () => void; onClearAll: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed left-2 right-2 top-[62px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white dark:bg-card border border-border/50 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[calc(100vh-80px)] overflow-y-auto sm:max-h-none sm:overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-primary/5">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm">Notifikasi</span>
          {unread > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button onClick={onMarkAllRead} className="text-xs text-primary hover:underline">Semua dibaca</button>
          )}
          {notifs.length > 0 && (
            <button onClick={onClearAll} className="text-xs text-muted-foreground hover:text-foreground">Hapus</button>
          )}
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Permission banner */}
      {permission !== "granted" && (
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700/30">
          <p className="text-xs text-amber-800 dark:text-amber-300 mb-2 leading-snug">
            {permission === "denied"
              ? "⚠️ Notifikasi browser diblokir. Izinkan di pengaturan browser Anda."
              : "Aktifkan notifikasi browser agar alert muncul meski tab diminimalkan."}
          </p>
          {permission !== "denied" && (
            <button onClick={onRequestPermission}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-3 py-1.5 font-medium transition-colors">
              Aktifkan Notifikasi Browser
            </button>
          )}
        </div>
      )}

      {/* List */}
      <div className="max-h-64 overflow-y-auto">
        {notifs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p>Belum ada notifikasi</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {notifs.map((n) => (
              <div key={n.id} className={`px-4 py-3 flex items-start gap-3 transition-colors ${!n.read ? "bg-primary/[0.03]" : ""}`}>
                <span className="text-base leading-none mt-0.5 shrink-0">{NOTIF_ICON[n.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold leading-snug ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                    {n.title.replace(" (Simulasi)", "")}
                    {n.title.includes("Simulasi") && (
                      <span className="ml-1 text-[9px] bg-muted px-1 rounded font-normal">simulasi</span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1">
                    {n.at.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {!n.read && <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ─── Password input helper ────────────────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder, autoFocus, id }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; autoFocus?: boolean; id?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} className="pr-10"
        placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus} />
      <button type="button" tabIndex={-1} onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (token: string, remember: boolean) => void }) {
  const [mode, setMode] = useState<"login" | "reset">("login");

  // Login state
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Reset password state
  const [masterKey, setMasterKey] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true); setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.message || "Password salah"); return; }
      onLogin(data.token, remember);
    } catch {
      setLoginError("Koneksi gagal");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError("");
    if (newPw.length < 6) { setResetError("Password baru minimal 6 karakter"); return; }
    if (newPw !== confirmPw) { setResetError("Konfirmasi password tidak cocok"); return; }
    setResetLoading(true);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterKey, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setResetError(data.message || "Gagal mereset password"); return; }
      setResetSuccess(true);
    } catch {
      setResetError("Koneksi gagal");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-card rounded-2xl shadow-xl border border-border/50 p-8 w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-6">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors
            ${mode === "reset" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-primary/10"}`}>
            {mode === "reset"
              ? <KeyRound className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              : <Lock className="w-7 h-7 text-primary" />}
          </div>
          <h1 className="text-2xl font-bold font-display">
            {mode === "reset" ? "Reset Password" : "Admin Dashboard"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Ndalem Pleret Guest House</p>
        </div>

        {/* ── Login Mode ── */}
        {mode === "login" && (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="password" className="text-sm mb-1 block">Password Admin</Label>
                <PasswordInput id="password" value={password} onChange={setPassword}
                  placeholder="Masukkan password" autoFocus />
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <div
                  onClick={() => setRemember((v) => !v)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0
                    ${remember ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"}`}
                >
                  {remember && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="text-sm text-muted-foreground">Ingat saya selama 30 hari</span>
              </label>

              {loginError && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
                  <AlertTriangle className="w-4 h-4 shrink-0" />{loginError}
                </div>
              )}
              <Button type="submit" className="w-full h-11" disabled={loginLoading}>
                {loginLoading ? "Memproses..." : "Masuk"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => { setMode("reset"); setLoginError(""); }}
                className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
              >
                Lupa password? Reset di sini
              </button>
            </div>
          </>
        )}

        {/* ── Reset Mode ── */}
        {mode === "reset" && (
          <>
            {resetSuccess ? (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400">Password berhasil direset!</p>
                  <p className="text-sm text-muted-foreground mt-1">Silakan login dengan password baru Anda.</p>
                </div>
                <Button className="w-full h-10" onClick={() => { setMode("login"); setResetSuccess(false); setMasterKey(""); setNewPw(""); setConfirmPw(""); }}>
                  Kembali ke Login
                </Button>
              </div>
            ) : (
              <>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg px-4 py-3 mb-4">
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-snug">
                    Masukkan <strong>Master Key</strong> — yaitu password default bawaan Railway (dari env var <code className="bg-amber-100 dark:bg-amber-800/50 px-1 rounded">ADMIN_PASSWORD</code>). Master key ini selalu berfungsi meskipun kamu sudah mengganti password.
                  </p>
                </div>
                <form onSubmit={handleReset} className="space-y-3">
                  <div>
                    <Label className="text-xs mb-1 block">Master Key</Label>
                    <PasswordInput value={masterKey} onChange={setMasterKey} placeholder="Password default Railway" autoFocus />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Password Baru</Label>
                    <PasswordInput value={newPw} onChange={setNewPw} placeholder="Minimal 6 karakter" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Konfirmasi Password Baru</Label>
                    <PasswordInput value={confirmPw} onChange={setConfirmPw} placeholder="Ulangi password baru" />
                    {confirmPw && newPw !== confirmPw && (
                      <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
                    )}
                  </div>
                  {resetError && (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
                      <AlertTriangle className="w-4 h-4 shrink-0" />{resetError}
                    </div>
                  )}
                  <Button type="submit" className="w-full h-10"
                    disabled={resetLoading || !masterKey || !newPw || newPw !== confirmPw}>
                    {resetLoading ? "Mereset..." : "Reset Password"}
                  </Button>
                </form>
                <div className="mt-3 text-center">
                  <button onClick={() => { setMode("login"); setResetError(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    ← Kembali ke login
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ token, onClose, onSuccess }: {
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPw.length < 6) { setError("Password baru minimal 6 karakter"); return; }
    if (newPw !== confirmPw) { setError("Konfirmasi password tidak cocok"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Gagal mengubah password"); return; }
      setSuccess(true);
      // Token lama (= password lama) sudah tidak valid — logout setelah 3 detik
      setTimeout(onSuccess, 3000);
    } catch {
      setError("Koneksi gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-card rounded-2xl shadow-2xl border border-border/50 p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-bold">Ganti Password</h2>
          </div>
          {!success && (
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {success ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-semibold text-green-700 dark:text-green-400">Password berhasil diubah!</p>
            <p className="text-sm text-muted-foreground">Anda akan dikeluarkan dan perlu login ulang dengan password baru...</p>
            <div className="flex justify-center">
              <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs mb-1 block">Password Saat Ini</Label>
              <PasswordInput value={currentPw} onChange={setCurrentPw}
                placeholder="Password yang sedang digunakan" autoFocus />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Password Baru</Label>
              <PasswordInput value={newPw} onChange={setNewPw} placeholder="Minimal 6 karakter" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Konfirmasi Password Baru</Label>
              <PasswordInput value={confirmPw} onChange={setConfirmPw} placeholder="Ulangi password baru" />
              {confirmPw && newPw !== confirmPw && (
                <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
              )}
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}
            <Button type="submit" className="w-full h-10"
              disabled={loading || !currentPw || !newPw || newPw !== confirmPw}>
              {loading ? "Menyimpan..." : "Simpan Password Baru"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Booking Row ──────────────────────────────────────────────────────────────
function BookingRow({ booking, token, onRefresh }: { booking: Booking; token: string; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(booking.adminNotes ?? "");

  // ── Edit Tanggal ──
  const [editingDates, setEditingDates] = useState(false);
  const [dateDraft, setDateDraft] = useState({
    checkIn: booking.checkIn.slice(0, 10),
    checkOut: booking.checkOut.slice(0, 10),
  });
  const [dateAvailability, setDateAvailability] = useState<"idle" | "checking" | "available" | "conflict">("idle");

  const pricePerNight = booking.nights > 0 ? Math.round(booking.totalPrice / booking.nights) : 600_000;
  const draftNights = (() => {
    const d1 = new Date(dateDraft.checkIn + "T12:00:00Z");
    const d2 = new Date(dateDraft.checkOut + "T12:00:00Z");
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  })();
  const draftTotal = pricePerNight * draftNights;

  // Auto-check availability saat tanggal berubah (debounce 600ms)
  useEffect(() => {
    if (!editingDates || !dateDraft.checkIn || !dateDraft.checkOut || draftNights < 1) return;
    // Kalau sama dengan aslinya, langsung "tersedia"
    if (
      dateDraft.checkIn === booking.checkIn.slice(0, 10) &&
      dateDraft.checkOut === booking.checkOut.slice(0, 10)
    ) {
      setDateAvailability("available");
      return;
    }
    setDateAvailability("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/bookings/${booking.id}/check-dates?checkIn=${dateDraft.checkIn}&checkOut=${dateDraft.checkOut}`,
          { headers: { "x-admin-token": token } }
        );
        const data = await res.json();
        setDateAvailability(data.available ? "available" : "conflict");
      } catch {
        setDateAvailability("idle");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [dateDraft.checkIn, dateDraft.checkOut, editingDates]);

  async function saveDates() {
    if (dateAvailability !== "available" || draftNights < 1) return;
    setLoading(true);
    await fetch(`/api/admin/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ checkIn: dateDraft.checkIn, checkOut: dateDraft.checkOut }),
    });
    setLoading(false);
    setEditingDates(false);
    setDateAvailability("idle");
    onRefresh();
  }

  async function update(field: "status" | "paymentStatus", value: string) {
    setLoading(true);
    await fetch(`/api/admin/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ [field]: value }),
    });
    setLoading(false);
    onRefresh();
  }

  async function saveAdminNotes() {
    setLoading(true);
    await fetch(`/api/admin/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ adminNotes: notesDraft }),
    });
    setLoading(false);
    setEditingNotes(false);
    onRefresh();
  }

  async function deleteBooking() {
    setLoading(true);
    await fetch(`/api/admin/bookings/${booking.id}`, {
      method: "DELETE",
      headers: { "x-admin-token": token },
    });
    setLoading(false);
    setConfirmDelete(false);
    onRefresh();
  }

  return (
    <div className="bg-white dark:bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm">
      <div
        className="flex items-start justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-primary">{booking.bookingRef}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[booking.status] ?? ""}`}>
              {STATUS_LABELS[booking.status] ?? booking.status}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PAYMENT_COLORS[booking.paymentStatus] ?? ""}`}>
              {PAYMENT_LABELS[booking.paymentStatus] ?? booking.paymentStatus}
            </span>
          </div>
          <p className="font-semibold text-sm mt-1">{booking.guestName}</p>
          <p className="text-xs text-muted-foreground">{booking.unitName} · {booking.nights} malam · {formatIDR(booking.totalPrice)}</p>
          <p className="text-xs text-muted-foreground">{booking.checkIn} → {booking.checkOut}</p>
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/50 p-4 space-y-4 bg-muted/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /><a href={`tel:${booking.guestPhone}`} className="text-primary hover:underline">{booking.guestPhone}</a></div>
            <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground truncate">{booking.guestEmail}</span></div>
            <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /><span>{booking.guestCount} tamu</span></div>
            <div className="flex items-center gap-2"><BedDouble className="w-4 h-4 text-muted-foreground" /><span>{booking.unitName}</span></div>
          </div>
          {booking.notes && <p className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg">📝 {booking.notes}</p>}

          {/* ── Edit Tanggal ── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Tanggal Menginap
              </span>
              {!editingDates && (
                <button
                  onClick={() => {
                    setDateDraft({ checkIn: booking.checkIn.slice(0, 10), checkOut: booking.checkOut.slice(0, 10) });
                    setDateAvailability("idle");
                    setEditingDates(true);
                  }}
                  className="text-xs text-primary hover:underline flex items-center gap-1 transition-colors"
                >
                  <Pencil className="w-3 h-3" /> Edit Tanggal
                </button>
              )}
            </div>

            {editingDates ? (
              <div className="space-y-3 p-3 rounded-lg bg-secondary/40 border border-border/50">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Check-in Baru</Label>
                    <Input
                      type="date"
                      value={dateDraft.checkIn}
                      onChange={(e) => {
                        setDateDraft((d) => ({ ...d, checkIn: e.target.value }));
                        setDateAvailability("idle");
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Check-out Baru</Label>
                    <Input
                      type="date"
                      value={dateDraft.checkOut}
                      min={dateDraft.checkIn}
                      onChange={(e) => {
                        setDateDraft((d) => ({ ...d, checkOut: e.target.value }));
                        setDateAvailability("idle");
                      }}
                    />
                  </div>
                </div>

                {/* Preview malam + total */}
                {draftNights > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">{draftNights}</strong> malam
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">
                      Total: <strong className="text-foreground">{formatIDR(draftTotal)}</strong>
                    </span>
                    {(draftNights !== booking.nights || draftTotal !== booking.totalPrice) && (
                      <span className="text-amber-600 dark:text-amber-400 text-[10px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-1.5 py-0.5 rounded-full">
                        sebelumnya {booking.nights} malam · {formatIDR(booking.totalPrice)}
                      </span>
                    )}
                  </div>
                )}

                {/* Availability status */}
                {dateAvailability === "checking" && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Mengecek ketersediaan...
                  </div>
                )}
                {dateAvailability === "available" && (
                  <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 px-3 py-2 rounded-lg">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Tanggal tersedia — siap disimpan</span>
                  </div>
                )}
                {dateAvailability === "conflict" && (
                  <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 px-3 py-2 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Tanggal bentrok dengan booking atau pemblokiran lain</span>
                  </div>
                )}
                {draftNights < 1 && dateDraft.checkIn && dateDraft.checkOut && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Check-out harus setelah check-in</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs rounded-lg"
                    onClick={saveDates}
                    disabled={loading || dateAvailability !== "available" || draftNights < 1}
                  >
                    <Check className="w-3 h-3 mr-1" /> Simpan Tanggal
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs rounded-lg text-muted-foreground"
                    onClick={() => { setEditingDates(false); setDateAvailability("idle"); }}
                    disabled={loading}
                  >
                    Batal
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-foreground">
                {booking.checkIn.slice(0, 10)} → {booking.checkOut.slice(0, 10)}
                <span className="text-muted-foreground ml-2">({booking.nights} malam)</span>
              </p>
            )}
          </div>

          {/* ── Admin Notes ── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5" /> Catatan Admin
              </span>
              {!editingNotes && (
                <button
                  onClick={() => { setNotesDraft(booking.adminNotes ?? ""); setEditingNotes(true); }}
                  className="text-xs text-primary hover:underline flex items-center gap-1 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  {booking.adminNotes ? "Edit" : "Tambah Catatan"}
                </button>
              )}
            </div>

            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  className="w-full text-xs border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={3}
                  placeholder="Tulis catatan internal untuk booking ini..."
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs rounded-lg" onClick={saveAdminNotes} disabled={loading}>
                    <Check className="w-3 h-3 mr-1" /> Simpan
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg text-muted-foreground" onClick={() => setEditingNotes(false)} disabled={loading}>
                    Batal
                  </Button>
                </div>
              </div>
            ) : booking.adminNotes ? (
              <p className="text-xs text-foreground bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 p-3 rounded-lg whitespace-pre-wrap">
                {booking.adminNotes}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/50 italic">Belum ada catatan admin</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {booking.status === "pending" && (
              <>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white rounded-lg h-8 text-xs" onClick={() => update("status", "confirmed")} disabled={loading}>
                  <Check className="w-3 h-3 mr-1" /> Konfirmasi
                </Button>
                <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg h-8 text-xs" onClick={() => update("status", "cancelled")} disabled={loading}>
                  <X className="w-3 h-3 mr-1" /> Batalkan
                </Button>
              </>
            )}
            {booking.status === "confirmed" && (
              <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg h-8 text-xs" onClick={() => update("status", "cancelled")} disabled={loading}>
                <X className="w-3 h-3 mr-1" /> Batalkan
              </Button>
            )}
            {booking.paymentStatus === "pending" && booking.status !== "cancelled" && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-8 text-xs" onClick={() => update("paymentStatus", "paid")} disabled={loading}>
                <Banknote className="w-3 h-3 mr-1" /> Tandai Lunas
              </Button>
            )}
            <a
              href={`https://wa.me/${booking.guestPhone.replace(/[^0-9]/g, "").replace(/^0/, "62")}?text=${encodeURIComponent(
                `Halo ${booking.guestName}, pemesanan Anda di Ndalem Pleret (${booking.bookingRef}) telah dikonfirmasi! 🎉\n\n` +
                `Berikut info Wi-Fi ${booking.unitName}:\n` +
                (booking.unitName?.toLowerCase().includes("tengah")
                  ? "Username: *Omahtamu*\nPassword: *ynwa2022*"
                  : "Username: *Guesthouse*\nPassword: *ndalempleret*") +
                `\n\n📧 Panduan check-in lengkap sudah kami kirim ke email Anda. Jika tidak ada di inbox, silakan cek folder *Promotions* atau *Spam*.\n\nSelamat menginap & jangan ragu hubungi kami jika ada pertanyaan! 😊`
              )}`}
              target="_blank" rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/30">
                <Phone className="w-3 h-3 mr-1" /> WA Tamu
              </Button>
            </a>

            {/* Delete button — muncul untuk semua status */}
            {!confirmDelete ? (
              <Button
                size="sm" variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg h-8 text-xs ml-auto"
                onClick={() => setConfirmDelete(true)}
                disabled={loading}
              >
                <Trash2 className="w-3 h-3 mr-1" /> Hapus Data
              </Button>
            ) : (
              <div className="ml-auto flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg px-3 py-1.5">
                <span className="text-xs text-red-700 dark:text-red-400 font-medium">Hapus permanen?</span>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white h-6 text-xs px-2 rounded" onClick={deleteBooking} disabled={loading}>
                  Ya, Hapus
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs px-2 rounded text-muted-foreground" onClick={() => setConfirmDelete(false)} disabled={loading}>
                  Batal
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Download Panel ───────────────────────────────────────────────────────────
interface DownloadFilters {
  dateFrom: string; dateTo: string;
  status: string; paymentStatus: string; unitId: string;
}

function DownloadPanel({ bookings, onClose }: { bookings: Booking[]; onClose: () => void }) {
  const [filters, setFilters] = useState<DownloadFilters>({
    dateFrom: "", dateTo: "", status: "all", paymentStatus: "all", unitId: "all",
  });
  const [format, setFormat] = useState<"csv" | "xlsx" | "pdf">("csv");
  const [loading, setLoading] = useState(false);

  function applyFilters(data: Booking[]): Booking[] {
    return data.filter((b) => {
      if (filters.status !== "all" && b.status !== filters.status) return false;
      if (filters.paymentStatus !== "all" && b.paymentStatus !== filters.paymentStatus) return false;
      if (filters.unitId !== "all" && String(b.unitId) !== filters.unitId) return false;
      if (filters.dateFrom && b.checkIn.slice(0, 10) < filters.dateFrom) return false;
      if (filters.dateTo && b.checkIn.slice(0, 10) > filters.dateTo) return false;
      return true;
    });
  }

  const filtered = applyFilters(bookings);

  function todayStr() { return new Date().toISOString().slice(0, 10); }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function downloadCSV() {
    const data = applyFilters(bookings);
    const headers = [
      "Kode Booking", "Nama Tamu", "No. Telepon", "Email", "Unit",
      "Check-in", "Check-out", "Malam", "Total Harga (IDR)", "Jumlah Tamu",
      "Status Booking", "Status Pembayaran", "Catatan Tamu", "Catatan Admin", "Tanggal Pesan",
    ];
    const rows = data.map((b) => [
      b.bookingRef, b.guestName, b.guestPhone, b.guestEmail, b.unitName,
      b.checkIn.slice(0, 10), b.checkOut.slice(0, 10), b.nights, b.totalPrice, b.guestCount,
      STATUS_LABELS[b.status] ?? b.status,
      PAYMENT_LABELS[b.paymentStatus] ?? b.paymentStatus,
      b.notes ?? "", b.adminNotes ?? "",
      b.createdAt ? new Date(b.createdAt).toLocaleDateString("id-ID") : "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, `booking-ndalempleret-${todayStr()}.csv`);
  }

  async function downloadXLSX() {
    setLoading(true);
    try {
      const XLSX = await import("xlsx");
      const data = applyFilters(bookings);
      const rows = data.map((b) => ({
        "Kode Booking": b.bookingRef,
        "Nama Tamu": b.guestName,
        "No. Telepon": b.guestPhone,
        "Email": b.guestEmail,
        "Unit": b.unitName,
        "Check-in": b.checkIn.slice(0, 10),
        "Check-out": b.checkOut.slice(0, 10),
        "Malam": b.nights,
        "Total Harga (IDR)": b.totalPrice,
        "Jumlah Tamu": b.guestCount,
        "Status Booking": STATUS_LABELS[b.status] ?? b.status,
        "Status Pembayaran": PAYMENT_LABELS[b.paymentStatus] ?? b.paymentStatus,
        "Catatan Tamu": b.notes ?? "",
        "Catatan Admin": b.adminNotes ?? "",
        "Tanggal Pesan": b.createdAt ? new Date(b.createdAt).toLocaleDateString("id-ID") : "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      // Auto-width columns
      const keys = Object.keys(rows[0] ?? {});
      ws["!cols"] = keys.map((key) => ({
        wch: Math.max(key.length, ...rows.map((r) => String((r as Record<string,unknown>)[key] ?? "").length)) + 2,
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data Booking");
      XLSX.writeFile(wb, `booking-ndalempleret-${todayStr()}.xlsx`);
    } finally {
      setLoading(false);
    }
  }

  function downloadPDF() {
    const data = applyFilters(bookings);
    const tableRows = data.map((b) => `
      <tr>
        <td>${b.bookingRef}</td>
        <td>${b.guestName}</td>
        <td>${b.unitName}</td>
        <td>${b.checkIn.slice(0, 10)}</td>
        <td>${b.checkOut.slice(0, 10)}</td>
        <td style="text-align:center">${b.nights}</td>
        <td style="text-align:right">Rp ${b.totalPrice.toLocaleString("id-ID")}</td>
        <td style="text-align:center">${b.guestCount}</td>
        <td><span class="badge ${b.status}">${STATUS_LABELS[b.status] ?? b.status}</span></td>
        <td><span class="badge ${b.paymentStatus === "paid" ? "paid" : "unpaid"}">${PAYMENT_LABELS[b.paymentStatus] ?? b.paymentStatus}</span></td>
        <td>${b.guestPhone}</td>
        <td>${b.adminNotes ?? "-"}</td>
      </tr>`).join("");

    const filterDesc: string[] = [];
    if (filters.dateFrom) filterDesc.push(`Check-in ≥ ${filters.dateFrom}`);
    if (filters.dateTo) filterDesc.push(`Check-in ≤ ${filters.dateTo}`);
    if (filters.status !== "all") filterDesc.push(`Status: ${STATUS_LABELS[filters.status]}`);
    if (filters.paymentStatus !== "all") filterDesc.push(`Bayar: ${PAYMENT_LABELS[filters.paymentStatus]}`);
    if (filters.unitId !== "all") filterDesc.push(`Unit: ${filters.unitId === "1" ? "Ndalem Belakang" : "Ndalem Tengah"}`);

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"/>
<title>Data Booking — Ndalem Pleret</title>
<style>
  body{font-family:Arial,sans-serif;font-size:10px;margin:20px;color:#1a1a1a}
  h1{font-size:15px;margin:0 0 2px}
  .meta{font-size:9px;color:#666;margin-bottom:14px}
  table{width:100%;border-collapse:collapse}
  th{background:#111827;color:#fff;padding:6px 8px;text-align:left;font-size:9px;white-space:nowrap}
  td{padding:5px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top;font-size:9px}
  tr:nth-child(even) td{background:#f9fafb}
  .badge{padding:2px 6px;border-radius:999px;font-size:8px;font-weight:bold;white-space:nowrap}
  .pending{background:#fef3c7;color:#92400e}
  .confirmed{background:#d1fae5;color:#065f46}
  .cancelled{background:#fee2e2;color:#991b1b}
  .paid{background:#dbeafe;color:#1e3a8a}
  .unpaid{background:#f3f4f6;color:#374151}
  @media print{body{margin:0}button{display:none!important}}
</style></head>
<body>
  <h1>📋 Data Booking — Ndalem Pleret Guest House</h1>
  <p class="meta">
    Dicetak: ${new Date().toLocaleString("id-ID")} &nbsp;·&nbsp;
    Total: <strong>${data.length} booking</strong>
    ${filterDesc.length ? `&nbsp;·&nbsp; Filter: ${filterDesc.join(", ")}` : ""}
  </p>
  <table>
    <thead><tr>
      <th>Kode</th><th>Nama Tamu</th><th>Unit</th><th>Check-in</th><th>Check-out</th>
      <th>Malam</th><th>Total</th><th>Tamu</th><th>Status</th><th>Bayar</th>
      <th>No. HP</th><th>Catatan Admin</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <script>window.onload=function(){window.print()}<\/script>
</body></html>`;

    const win = window.open("", "_blank", "width=1200,height=850");
    if (!win) { alert("Pop-up diblokir browser. Izinkan pop-up untuk menggunakan fitur ini."); return; }
    win.document.write(html);
    win.document.close();
  }

  async function handleDownload() {
    if (format === "csv") downloadCSV();
    else if (format === "xlsx") await downloadXLSX();
    else downloadPDF();
  }

  return (
    <div className="bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-primary/5">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">Export Data Booking</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Filters */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Filter Data
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Check-in Dari</Label>
              <Input type="date" value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Check-in Sampai</Label>
              <Input type="date" value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Status Booking</Label>
              <select className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="confirmed">Dikonfirmasi</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Status Pembayaran</Label>
              <select className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={filters.paymentStatus} onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value }))}>
                <option value="all">Semua Pembayaran</option>
                <option value="pending">Belum Bayar</option>
                <option value="paid">Sudah Bayar</option>
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Unit</Label>
              <select className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={filters.unitId} onChange={(e) => setFilters((f) => ({ ...f, unitId: e.target.value }))}>
                <option value="all">Semua Unit</option>
                <option value="1">Ndalem Belakang</option>
                <option value="2">Ndalem Tengah</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ dateFrom: "", dateTo: "", status: "all", paymentStatus: "all", unitId: "all" })}
                className="w-full text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors hover:bg-muted"
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>

        {/* Preview count */}
        <div className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2.5 font-medium
          ${filtered.length > 0
            ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700/40"
            : "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/40"}`}>
          <span className="text-2xl font-bold font-mono leading-none">{filtered.length}</span>
          <span>data booking akan diunduh</span>
        </div>

        {/* Format selector */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Format File</p>
          <div className="grid grid-cols-3 gap-3">
            {([
              { id: "csv" as const, label: "CSV", desc: "Excel & Google Sheets", icon: <FileText className="w-5 h-5" /> },
              { id: "xlsx" as const, label: "Excel (.xlsx)", desc: "Microsoft Excel", icon: <FileSpreadsheet className="w-5 h-5" /> },
              { id: "pdf" as const, label: "PDF / Print", desc: "Cetak atau simpan PDF", icon: <Printer className="w-5 h-5" /> },
            ] as const).map(({ id, label, desc, icon }) => (
              <button
                key={id}
                onClick={() => setFormat(id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center
                  ${format === id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"}`}
              >
                {icon}
                <div>
                  <p className="text-xs font-semibold leading-tight">{label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Download button */}
        <Button
          className="w-full h-11 text-sm font-semibold"
          onClick={handleDownload}
          disabled={filtered.length === 0 || loading}
        >
          {loading
            ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Menyiapkan...</>
            : <><Download className="w-4 h-4 mr-2" /> Export {filtered.length} Data ({format === "pdf" ? "PDF" : format.toUpperCase()})</>
          }
        </Button>
      </div>
    </div>
  );
}

// ─── Admin Calendar Preview ───────────────────────────────────────────────────
const DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

/** Expands a booking's check-in → check-out range into individual date strings */
function expandBookingDates(bookings: Booking[], unitId: number): Map<string, Booking> {
  const map = new Map<string, Booking>();
  for (const b of bookings) {
    if (b.unitId !== unitId || b.status === "cancelled") continue;
    let cur = b.checkIn.slice(0, 10);
    const last = b.checkOut.slice(0, 10);
    while (cur < last) {
      map.set(cur, b);
      const d = new Date(cur + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + 1);
      cur = d.toISOString().slice(0, 10);
    }
  }
  return map;
}

function AdminCalendarGrid({
  month, year, bookedMap, blockedSet,
}: {
  month: number;
  year: number;
  bookedMap: Map<string, Booking>;
  blockedSet: Set<string>;
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = getDaysInMonth(new Date(year, month));

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS_ID.map((d) => (
          <div key={d} className="text-center text-[10px] text-muted-foreground py-1 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} className="h-7" />;
          const date = new Date(year, month, day);
          const ds = format(date, "yyyy-MM-dd");
          const isPast = isBefore(date, today);
          const isCurrentDay = isToday(date);
          const booking = bookedMap.get(ds);
          const isBlocked = blockedSet.has(ds);

          let cellClass = "h-7 rounded flex items-center justify-center text-[11px] font-medium transition-colors relative";
          let title = "";

          if (isPast) {
            cellClass += " text-muted-foreground/25";
          } else if (booking) {
            const isPending = booking.status === "pending";
            cellClass += isPending
              ? " bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 cursor-default"
              : " bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 cursor-default";
            title = `${booking.guestName} · ${booking.bookingRef} (${isPending ? "Menunggu" : "Dikonfirmasi"})`;
          } else if (isBlocked) {
            cellClass += " bg-gray-200 text-gray-500 dark:bg-gray-700/60 dark:text-gray-400 cursor-default";
            title = "Diblokir";
          } else {
            cellClass += " bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400";
          }

          if (isCurrentDay && !isPast) {
            cellClass += " ring-2 ring-blue-400";
          }

          return (
            <div key={ds} className="relative group">
              <div className={cellClass} title={title}>{day}</div>
              {/* Tooltip on hover for booked dates */}
              {title && !isPast && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 pointer-events-none">
                  <div className="bg-gray-900 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl leading-snug">
                    {isBlocked ? "📵 Diblokir manual" : (
                      <>
                        <span className="font-semibold">{booking!.guestName}</span>
                        <br />
                        <span className="text-gray-300">{booking!.bookingRef}</span>
                        <span className={`ml-1.5 px-1 rounded text-[9px] font-bold ${booking!.status === "pending" ? "bg-amber-500" : "bg-red-500"} text-white`}>
                          {booking!.status === "pending" ? "PENDING" : "CONFIRMED"}
                        </span>
                      </>
                    )}
                  </div>
                  {/* Arrow */}
                  <div className="flex justify-center">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminCalendarPreview({ bookings, blockedDates }: { bookings: Booking[]; blockedDates: BlockedDate[] }) {
  const [viewMonth, setViewMonth] = useState(() => new Date());

  const today = new Date();
  const canGoPrev =
    viewMonth.getFullYear() > today.getFullYear() ||
    (viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() > today.getMonth());

  const UNITS = [
    { id: 1, name: "Ndalem Belakang" },
    { id: 2, name: "Ndalem Tengah" },
  ];

  // Build maps for each unit
  const unitData = UNITS.map((u) => {
    const bookedMap = expandBookingDates(bookings, u.id);
    const blockedSet = new Set(blockedDates.filter((bd) => bd.unitId === u.id).map((bd) => bd.date.slice(0, 10)));

    // Count stats for this month
    const daysInMonth = getDaysInMonth(viewMonth);
    let available = 0, booked = 0, blocked = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d);
      if (isBefore(date, today)) continue;
      const ds = format(date, "yyyy-MM-dd");
      if (bookedMap.has(ds)) booked++;
      else if (blockedSet.has(ds)) blocked++;
      else available++;
    }

    return { ...u, bookedMap, blockedSet, available, booked, blocked };
  });

  // Upcoming bookings in this month
  const monthStart = format(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1), "yyyy-MM-dd");
  const monthEnd = format(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0), "yyyy-MM-dd");
  const monthBookings = bookings.filter(
    (b) => b.status !== "cancelled" && b.checkIn.slice(0, 10) <= monthEnd && b.checkOut.slice(0, 10) > monthStart
  ).sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm p-4 flex items-center justify-between">
        <button
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          disabled={!canGoPrev}
          className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold font-display">
          {MONTHS_ID[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </h3>
        <button
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm p-4 flex flex-wrap gap-4 text-xs">
        {[
          { cls: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400", label: "Tersedia" },
          { cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", label: "Pending" },
          { cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", label: "Dikonfirmasi" },
          { cls: "bg-gray-200 text-gray-500 dark:bg-gray-700/60 dark:text-gray-400", label: "Diblokir manual" },
          { cls: "ring-2 ring-blue-400 text-xs", label: "Hari ini" },
        ].map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded ${cls} flex items-center justify-center font-medium`}>1</div>
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
        <span className="text-muted-foreground text-xs self-center">— Hover tanggal untuk detail tamu</span>
      </div>

      {/* Two Calendars Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {unitData.map((u) => (
          <div key={u.id} className="bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
            {/* Unit Header */}
            <div className="bg-primary/5 border-b border-border/50 px-5 py-3 flex items-center justify-between">
              <h4 className="font-bold text-sm">{u.name}</h4>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  <span className="text-muted-foreground">{u.available} tersedia</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  <span className="text-muted-foreground">{u.booked} terisi</span>
                </span>
                {u.blocked > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                    <span className="text-muted-foreground">{u.blocked} diblokir</span>
                  </span>
                )}
              </div>
            </div>

            <div className="p-5">
              <AdminCalendarGrid
                month={viewMonth.getMonth()}
                year={viewMonth.getFullYear()}
                bookedMap={u.bookedMap}
                blockedSet={u.blockedSet}
              />

              {/* Next month mini preview */}
              <div className="mt-5 pt-4 border-t border-border/30">
                <p className="text-[10px] text-muted-foreground mb-3 font-medium uppercase tracking-wider">
                  {MONTHS_ID[addMonths(viewMonth, 1).getMonth()]}
                </p>
                <AdminCalendarGrid
                  month={addMonths(viewMonth, 1).getMonth()}
                  year={addMonths(viewMonth, 1).getFullYear()}
                  bookedMap={u.bookedMap}
                  blockedSet={u.blockedSet}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Bookings in this month */}
      <div className="bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h4 className="font-bold text-sm">Pemesanan di {MONTHS_ID[viewMonth.getMonth()]} {viewMonth.getFullYear()}</h4>
          <span className="ml-auto text-xs text-muted-foreground">{monthBookings.length} booking</span>
        </div>
        {monthBookings.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Tidak ada pemesanan bulan ini</div>
        ) : (
          <div className="divide-y divide-border/30">
            {monthBookings.map((b) => (
              <div key={b.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                <div className="w-2 h-8 rounded-full shrink-0" style={{ background: b.status === "pending" ? "#f59e0b" : "#ef4444" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">{b.guestName}</span>
                    <span className="font-mono text-xs text-muted-foreground">{b.bookingRef}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {b.unitName} · {b.checkIn.slice(0, 10)} → {b.checkOut.slice(0, 10)} · {b.nights} malam
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs font-semibold">{formatIDR(b.totalPrice)}</div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] ?? ""}`}>
                    {STATUS_LABELS[b.status] ?? b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Admin Dashboard (all hooks here, after auth confirmed) ───────────────────
function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<"bookings" | "blocked" | "calendar">("bookings");
  const [blockForm, setBlockForm] = useState({ unitId: "1", date: "", reason: "" });
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDownload, setShowDownload] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // ── Kosongkan Tanggal state ──
  const [clearForm, setClearForm] = useState({ unitId: "1", date: "" });
  const [clearResult, setClearResult] = useState<null | {
    type: "free" | "blocked" | "booked";
    blockedId?: number;
    blockedReason?: string;
    booking?: Booking;
  }>(null);
  const [clearLoading, setClearLoading] = useState(false);

  const headers = { "x-admin-token": token };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: bookings = [], refetch: refetchBookings } = useQuery<Booking[]>({
    queryKey: ["admin-bookings", token],
    queryFn: async () => {
      const res = await fetch("/api/admin/bookings", { headers });
      if (res.status === 401) { onLogout(); return []; }
      return res.json();
    },
    refetchInterval: 30_000, // auto-poll setiap 30 detik untuk deteksi booking baru
  });

  const { data: blockedDates = [], refetch: refetchBlocked } = useQuery<BlockedDate[]>({
    queryKey: ["admin-blocked", token],
    queryFn: async () => {
      const res = await fetch("/api/admin/blocked-dates", { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const notif = useAdminNotifications(bookings, token);

  // Tutup notif panel saat klik di luar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    }
    if (showNotifPanel) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifPanel]);

  // Update page title dengan badge unread
  useEffect(() => {
    document.title = notif.unread > 0
      ? `(${notif.unread}) Admin Dashboard · Ndalem Pleret`
      : "Admin Dashboard · Ndalem Pleret";
    return () => { document.title = "Ndalem Pleret"; };
  }, [notif.unread]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await Promise.all([refetchBookings(), refetchBlocked()]);
    setIsRefreshing(false);
  }

  async function addBlockedDate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/blocked-dates", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        unitId: parseInt(blockForm.unitId),
        date: blockForm.date,
        reason: blockForm.reason || undefined,
      }),
    });
    setBlockForm((f) => ({ ...f, date: "", reason: "" }));
    refetchBlocked();
  }

  async function removeBlockedDate(id: number) {
    await fetch(`/api/admin/blocked-dates/${id}`, { method: "DELETE", headers });
    refetchBlocked();
  }

  // ── Kosongkan: lookup tanggal di data yang sudah di-fetch ──
  function handleCheckDate() {
    const { unitId, date } = clearForm;
    if (!date) return;
    const uid = parseInt(unitId);

    // 1. Cek manual block
    const blockedEntry = blockedDates.find(
      (bd) => bd.unitId === uid && bd.date.slice(0, 10) === date
    );
    if (blockedEntry) {
      setClearResult({ type: "blocked", blockedId: blockedEntry.id, blockedReason: blockedEntry.reason ?? undefined });
      return;
    }

    // 2. Cek booking aktif (expand date ranges)
    const bookedMap = expandBookingDates(bookings, uid);
    const booking = bookedMap.get(date);
    if (booking) {
      setClearResult({ type: "booked", booking });
      return;
    }

    // 3. Bebas
    setClearResult({ type: "free" });
  }

  async function handleUnblockById(id: number) {
    setClearLoading(true);
    await fetch(`/api/admin/blocked-dates/${id}`, { method: "DELETE", headers });
    refetchBlocked();
    setClearResult(null);
    setClearForm((f) => ({ ...f, date: "" }));
    setClearLoading(false);
  }

  async function handleCancelBookingById(id: number) {
    setClearLoading(true);
    await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    refetchBookings();
    setClearResult(null);
    setClearForm((f) => ({ ...f, date: "" }));
    setClearLoading(false);
  }

  const filteredBookings = statusFilter === "all" ? bookings : bookings.filter((b) => b.status === statusFilter);
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const unpaidCount = bookings.filter((b) => b.paymentStatus === "pending" && b.status !== "cancelled").length;

  return (
    <div className="min-h-screen bg-secondary/30 font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-card border-b border-border/50 shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold font-display text-base sm:text-lg leading-tight">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">Ndalem Pleret Guest House</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Bell notifikasi */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setShowNotifPanel((v) => !v); if (!showNotifPanel) notif.markAllRead(); }}
                className={`relative h-8 w-8 flex items-center justify-center rounded-lg border transition-colors
                  ${showNotifPanel
                    ? "bg-primary text-white border-primary"
                    : "border-border bg-white dark:bg-card hover:bg-muted text-foreground"}`}
                title="Notifikasi"
              >
                {notif.unread > 0
                  ? <BellRing className="w-4 h-4 animate-[wiggle_0.5s_ease-in-out_infinite]" />
                  : <Bell className="w-4 h-4" />}
                {notif.unread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                    {notif.unread > 9 ? "9+" : notif.unread}
                  </span>
                )}
              </button>

              {showNotifPanel && (
                <NotifPanel
                  notifs={notif.notifs}
                  unread={notif.unread}
                  permission={notif.permission}
                  onRequestPermission={notif.requestPermission}
                  onMarkAllRead={notif.markAllRead}
                  onClearAll={notif.clearAll}
                  onClose={() => setShowNotifPanel(false)}
                />
              )}
            </div>

            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="rounded-lg h-8 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 mr-1 transition-transform ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Memuat..." : "Refresh"}
            </Button>
            <Button size="sm" variant="outline" onClick={onLogout} className="hidden md:flex rounded-lg h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30">
              <LogOut className="w-3.5 h-3.5 mr-1" /> Keluar
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Booking", value: bookings.length, color: "text-foreground" },
            { label: "Menunggu Konfirmasi", value: pendingCount, color: "text-amber-600" },
            { label: "Belum Lunas", value: unpaidCount, color: "text-red-600" },
            { label: "Dikonfirmasi", value: bookings.filter((b) => b.status === "confirmed").length, color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white dark:bg-card rounded-xl p-4 border border-border/50 shadow-sm">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold font-display ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border overflow-x-auto">
          {[
            { id: "bookings" as const, label: "Pemesanan" },
            { id: "calendar" as const, label: "Preview Kalender" },
            { id: "blocked" as const, label: "Kelola Tanggal" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: "all", label: "Semua" },
                { value: "pending", label: "Menunggu" },
                { value: "confirmed", label: "Dikonfirmasi" },
                { value: "cancelled", label: "Dibatalkan" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${statusFilter === f.value ? "bg-primary text-white" : "bg-white dark:bg-muted border border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  {f.label} ({f.value === "all" ? bookings.length : bookings.filter((b) => b.status === f.value).length})
                </button>
              ))}
              <button
                onClick={() => setShowDownload((v) => !v)}
                className={`ml-auto hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${showDownload ? "bg-primary text-white border-primary" : "bg-white dark:bg-muted border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
              >
                <Download className="w-3.5 h-3.5" />
                Export Data
              </button>
            </div>

            {showDownload && (
              <DownloadPanel bookings={bookings} onClose={() => setShowDownload(false)} />
            )}

            {filteredBookings.length === 0 ? (
              <div className="bg-white dark:bg-card rounded-xl border border-border/50 p-12 text-center text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Belum ada pemesanan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...filteredBookings].reverse().map((b) => (
                  <BookingRow key={b.id} booking={b} token={token} onRefresh={handleRefresh} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calendar Preview Tab */}
        {activeTab === "calendar" && (
          <AdminCalendarPreview bookings={bookings} blockedDates={blockedDates} />
        )}

        {/* Kelola Tanggal Tab */}
        {activeTab === "blocked" && (
          <div className="space-y-6">

            {/* ── Two-panel: Blokir + Kosongkan ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Panel kiri: Blokir Tanggal */}
              <div className="bg-white dark:bg-card rounded-xl border border-border/50 p-5 shadow-sm flex flex-col gap-4">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                  Blokir Tanggal
                </h3>
                <p className="text-xs text-muted-foreground -mt-2">
                  Tandai tanggal sebagai tidak tersedia (maintenance, keperluan pribadi, dll).
                </p>
                <form onSubmit={addBlockedDate} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1 block">Unit</Label>
                      <select
                        className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        value={blockForm.unitId}
                        onChange={(e) => setBlockForm((f) => ({ ...f, unitId: e.target.value }))}
                      >
                        <option value="1">Ndalem Belakang</option>
                        <option value="2">Ndalem Tengah</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Tanggal</Label>
                      <Input type="date" value={blockForm.date} onChange={(e) => setBlockForm((f) => ({ ...f, date: e.target.value }))} required />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Alasan (opsional)</Label>
                    <Input placeholder="Contoh: Maintenance, Acara Keluarga" value={blockForm.reason} onChange={(e) => setBlockForm((f) => ({ ...f, reason: e.target.value }))} />
                  </div>
                  <Button type="submit" className="w-full rounded-lg h-9 text-sm bg-red-600 hover:bg-red-700">
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Blokir Tanggal Ini
                  </Button>
                </form>
              </div>

              {/* Panel kanan: Kosongkan Tanggal */}
              <div className="bg-white dark:bg-card rounded-xl border border-border/50 p-5 shadow-sm flex flex-col gap-4">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <X className="w-3.5 h-3.5" />
                  </span>
                  Kosongkan Tanggal
                </h3>
                <p className="text-xs text-muted-foreground -mt-2">
                  Periksa tanggal tertentu — hapus blokir manual atau batalkan booking yang ada.
                </p>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1 block">Unit</Label>
                      <select
                        className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        value={clearForm.unitId}
                        onChange={(e) => { setClearForm((f) => ({ ...f, unitId: e.target.value })); setClearResult(null); }}
                      >
                        <option value="1">Ndalem Belakang</option>
                        <option value="2">Ndalem Tengah</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Tanggal</Label>
                      <Input
                        type="date"
                        value={clearForm.date}
                        onChange={(e) => { setClearForm((f) => ({ ...f, date: e.target.value })); setClearResult(null); }}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-lg h-9 text-sm"
                    onClick={handleCheckDate}
                    disabled={!clearForm.date}
                  >
                    <Calendar className="w-3.5 h-3.5 mr-1.5" /> Periksa Tanggal Ini
                  </Button>
                </div>

                {/* Result panel */}
                {clearResult && (
                  <div className={`rounded-xl p-4 border text-sm space-y-3 ${
                    clearResult.type === "free"    ? "bg-green-50 border-green-200" :
                    clearResult.type === "blocked" ? "bg-amber-50 border-amber-200" :
                                                     "bg-red-50 border-red-200"
                  }`}>
                    {clearResult.type === "free" && (
                      <div className="flex items-center gap-2 text-green-700">
                        <Check className="w-4 h-4 shrink-0" />
                        <span className="font-medium">Tanggal ini sudah kosong & tersedia.</span>
                      </div>
                    )}

                    {clearResult.type === "blocked" && (
                      <>
                        <div className="text-amber-800">
                          <p className="font-semibold flex items-center gap-1.5 mb-1">
                            <AlertTriangle className="w-4 h-4" /> Diblokir manual
                          </p>
                          {clearResult.blockedReason && (
                            <p className="text-xs text-amber-700">Alasan: <em>{clearResult.blockedReason}</em></p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="w-full rounded-lg h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs"
                          onClick={() => handleUnblockById(clearResult.blockedId!)}
                          disabled={clearLoading}
                        >
                          {clearLoading ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                          Hapus Blokir — Jadikan Tersedia
                        </Button>
                      </>
                    )}

                    {clearResult.type === "booked" && clearResult.booking && (
                      <>
                        <div className="text-red-800 space-y-1">
                          <p className="font-semibold flex items-center gap-1.5">
                            <BedDouble className="w-4 h-4" /> Ada booking aktif
                          </p>
                          <p className="text-xs"><span className="font-medium">Tamu:</span> {clearResult.booking.guestName}</p>
                          <p className="text-xs"><span className="font-medium">Kode:</span> <span className="font-mono">{clearResult.booking.bookingRef}</span></p>
                          <p className="text-xs"><span className="font-medium">Periode:</span> {clearResult.booking.checkIn.slice(0,10)} → {clearResult.booking.checkOut.slice(0,10)} ({clearResult.booking.nights} malam)</p>
                          <p className="text-xs"><span className="font-medium">Status:</span> {STATUS_LABELS[clearResult.booking.status] ?? clearResult.booking.status}</p>
                          <p className="text-xs text-red-600 mt-1">⚠️ Membatalkan akan membebaskan seluruh rentang tanggal booking ini.</p>
                        </div>
                        <Button
                          size="sm"
                          className="w-full rounded-lg h-8 bg-red-600 hover:bg-red-700 text-white text-xs"
                          onClick={() => handleCancelBookingById(clearResult.booking!.id)}
                          disabled={clearLoading}
                        >
                          {clearLoading ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <X className="w-3 h-3 mr-1" />}
                          Batalkan Booking — Kosongkan Tanggal
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Daftar Tanggal Diblokir ── */}
            <div className="bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-bold text-sm">Tanggal Diblokir Manual ({blockedDates.length})</h3>
                <span className="text-xs text-muted-foreground">Klik 🗑 untuk hapus</span>
              </div>
              {blockedDates.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Belum ada tanggal yang diblokir manual</div>
              ) : (
                <div className="divide-y divide-border/30">
                  {[...blockedDates]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((bd) => (
                    <div key={bd.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
                        <div>
                          <span className="text-sm font-medium">{bd.date.slice(0, 10)}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {bd.unitId === 1 ? "Ndalem Belakang" : "Ndalem Tengah"}
                          </span>
                          {bd.reason && (
                            <span className="text-xs text-muted-foreground ml-2">— {bd.reason}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeBlockedDate(bd.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                        title="Hapus blokir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}


      </div>

      {/* ── Mobile fixed action buttons ─────────────────────────────────────── */}
      {/* Keluar — bottom-left, mobile only */}
      <Button
        size="sm"
        variant="outline"
        onClick={onLogout}
        className="fixed bottom-4 left-4 z-30 md:hidden flex items-center gap-1.5 rounded-full h-10 px-4 text-xs font-semibold text-red-600 border-red-200 bg-white dark:bg-card dark:border-red-800 shadow-lg hover:bg-red-50 dark:hover:bg-red-900/30"
      >
        <LogOut className="w-3.5 h-3.5" /> Keluar
      </Button>

      {/* Export Data — bottom-right, mobile only */}
      <button
        onClick={() => { setActiveTab("bookings"); setShowDownload((v) => !v); }}
        className={`fixed bottom-4 right-4 z-30 md:hidden flex items-center gap-1.5 rounded-full h-10 px-4 text-xs font-semibold border shadow-lg transition-all ${showDownload ? "bg-primary text-white border-primary" : "bg-white dark:bg-card border-border text-foreground hover:bg-muted"}`}
      >
        <Download className="w-3.5 h-3.5" /> Export Data
      </button>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          token={token}
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => {
            setShowChangePassword(false);
            onLogout();
          }}
        />
      )}
    </div>
  );
}

// ─── Root: handles auth gate + persistent session ─────────────────────────────
const LS_ADMIN_SESSION = "np_admin_session";

function getPersistedToken(): string | null {
  // Cek localStorage dulu (remember me, 30 hari)
  try {
    const raw = localStorage.getItem(LS_ADMIN_SESSION);
    if (raw) {
      const { token, expiresAt } = JSON.parse(raw) as { token: string; expiresAt: number };
      if (Date.now() < expiresAt) return token;
      localStorage.removeItem(LS_ADMIN_SESSION); // expired
    }
  } catch {}
  // Fallback ke sessionStorage (tanpa remember me — hilang saat tab ditutup)
  return sessionStorage.getItem(LS_ADMIN_SESSION);
}

export default function Admin() {
  const [token, setToken] = useState<string | null>(getPersistedToken);

  function handleLogin(t: string, remember: boolean) {
    setToken(t);
    if (remember) {
      localStorage.setItem(LS_ADMIN_SESSION, JSON.stringify({
        token: t,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 hari
      }));
    } else {
      sessionStorage.setItem(LS_ADMIN_SESSION, t);
    }
  }

  function handleLogout() {
    setToken(null);
    localStorage.removeItem(LS_ADMIN_SESSION);
    sessionStorage.removeItem(LS_ADMIN_SESSION);
  }

  if (!token) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <AdminDashboard token={token} onLogout={handleLogout} />;
}
