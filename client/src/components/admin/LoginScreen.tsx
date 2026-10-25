import { useState } from "react";
import { Lock, Check, AlertTriangle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "./PasswordInput";

// ─── Login Screen ─────────────────────────────────────────────────────────────
export function LoginScreen({ onLogin }: { onLogin: (token: string, remember: boolean) => void }) {
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
                    Masukkan <strong>Master Key</strong> — yaitu password master yang diset di server (env var <code className="bg-amber-100 dark:bg-amber-800/50 px-1 rounded">ADMIN_PASSWORD</code>). Master key ini selalu berfungsi meskipun kamu sudah mengganti password.
                  </p>
                </div>
                <form onSubmit={handleReset} className="space-y-3">
                  <div>
                    <Label className="text-xs mb-1 block">Master Key</Label>
                    <PasswordInput value={masterKey} onChange={setMasterKey} placeholder="Master key (ADMIN_PASSWORD)" autoFocus />
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
