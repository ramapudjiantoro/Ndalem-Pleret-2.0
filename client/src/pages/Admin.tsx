import { useState } from "react";
import { LoginScreen } from "@/components/admin/LoginScreen";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

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
