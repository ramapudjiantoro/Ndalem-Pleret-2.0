import { useState } from "react";
import { Check, Banknote, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatIDR } from "@shared/format";
import type { Unit } from "./types";
import { adminFetch } from "./api";

// ─── Confirm Price Change Modal ────────────────────────────────────────────────
function ConfirmPriceModal({ unitName, oldPrice, newPrice, loading, onConfirm, onCancel }: {
  unitName: string; oldPrice: number; newPrice: number; loading: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-white dark:bg-card rounded-2xl shadow-2xl border border-border/50 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <Banknote className="w-4 h-4 text-primary" />
          </div>
          <h2 className="font-bold">Ubah Harga?</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Ubah harga <strong className="text-foreground">{unitName}</strong> dari{" "}
          <strong className="text-foreground">{formatIDR(oldPrice)}</strong> menjadi{" "}
          <strong className="text-primary">{formatIDR(newPrice)}</strong> per malam?
          Harga baru berlaku untuk pemesanan berikutnya.
        </p>
        <div className="flex gap-2">
          <Button className="flex-1 h-9" onClick={onConfirm} disabled={loading}>
            {loading ? "Menyimpan..." : "Ya, Ubah Harga"}
          </Button>
          <Button variant="ghost" className="flex-1 h-9" onClick={onCancel} disabled={loading}>
            Batal
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Unit Price Card ────────────────────────────────────────────────────────────
export function UnitPriceCard({ unit, token, onRefresh }: { unit: Unit; token: string; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(unit.pricePerNight));
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const draftPrice = Number(draft);
  const isValid = Number.isInteger(draftPrice) && draftPrice > 0;

  function startEdit() {
    setDraft(String(unit.pricePerNight));
    setError("");
    setEditing(true);
  }

  function requestSave() {
    if (!isValid) { setError("Harga harus angka bulat lebih dari 0"); return; }
    if (draftPrice === unit.pricePerNight) { setEditing(false); return; }
    setError("");
    setConfirming(true);
  }

  async function confirmSave() {
    setLoading(true);
    try {
      const res = await adminFetch(token, `/api/admin/units/${unit.id}`, "PATCH", { pricePerNight: draftPrice });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Gagal menyimpan harga");
        return;
      }
      setConfirming(false);
      setEditing(false);
      onRefresh();
    } catch {
      setError("Koneksi gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-card rounded-xl border border-border/50 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">{unit.name}</p>
          <p className="text-xs text-muted-foreground">Harga per malam</p>
        </div>
        {!editing && (
          <button onClick={startEdit} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Pencil className="w-3 h-3" /> Edit Harga
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rp</span>
            <Input
              type="number"
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setError(""); }}
              className="h-9 max-w-[180px]"
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-xs rounded-lg" onClick={requestSave} disabled={loading}>
              <Check className="w-3 h-3 mr-1" /> Simpan
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg text-muted-foreground" onClick={() => setEditing(false)} disabled={loading}>
              Batal
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-2xl font-bold font-display text-primary mt-2">{formatIDR(unit.pricePerNight)}</p>
      )}

      {confirming && (
        <ConfirmPriceModal
          unitName={unit.name}
          oldPrice={unit.pricePerNight}
          newPrice={draftPrice}
          loading={loading}
          onConfirm={confirmSave}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
