import { useState } from "react";
import { RefreshCw, Check, X, AlertTriangle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { adminFetch } from "./api";
import { PasswordInput } from "./PasswordInput";

// ─── Change Password Modal ────────────────────────────────────────────────────
export function ChangePasswordModal({ token, onClose, onSuccess }: {
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
      const res = await adminFetch(token, "/api/admin/change-password", "POST", { currentPassword: currentPw, newPassword: newPw });
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
