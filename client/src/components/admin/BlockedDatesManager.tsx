import { useState } from "react";
import { Plus, X, Check, Calendar, Trash2, AlertTriangle, BedDouble, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Booking, BlockedDate, STATUS_LABELS } from "./types";
import { adminFetch } from "./api";

// ─── Kelola Tanggal: blokir / kosongkan satu tanggal atau rentang tanggal ─────
const UNIT_NAMES: Record<number, string> = { 1: "Ndalem Belakang", 2: "Ndalem Tengah" };

/** "1" | "2" | "all" → daftar id unit */
function unitIdsOf(value: string): number[] {
  return value === "all" ? [1, 2] : [parseInt(value, 10)];
}

/** Tambah n hari ke "YYYY-MM-DD" (aman dari zona waktu) */
function addDays(ds: string, n: number): string {
  const d = new Date(ds + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayCount(start: string, end: string): number {
  return Math.round((Date.parse(end + "T12:00:00Z") - Date.parse(start + "T12:00:00Z")) / 86_400_000) + 1;
}

/** "2026-11-07" → "7 Nov 2026" */
function fmtDate(ds: string): string {
  return new Date(ds + "T12:00:00Z").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function fmtRange(start: string, end: string): string {
  return start === end ? fmtDate(start) : `${fmtDate(start)} – ${fmtDate(end)}`;
}

/** Gabungkan tanggal blokir yang berurutan (unit & alasan sama) jadi satu baris rentang */
type BlockedGroup = { unitId: number; start: string; end: string; reason: string | null; ids: number[] };
function groupBlocked(blocked: BlockedDate[]): BlockedGroup[] {
  const sorted = [...blocked].sort((a, b) => a.unitId - b.unitId || a.date.localeCompare(b.date));
  const groups: BlockedGroup[] = [];
  for (const bd of sorted) {
    const ds = bd.date.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.unitId === bd.unitId && (last.reason ?? "") === (bd.reason ?? "") && addDays(last.end, 1) === ds) {
      last.end = ds;
      last.ids.push(bd.id);
    } else if (last && last.unitId === bd.unitId && last.end === ds) {
      last.ids.push(bd.id); // duplikat tanggal yang sama
    } else {
      groups.push({ unitId: bd.unitId, start: ds, end: ds, reason: bd.reason ?? null, ids: [bd.id] });
    }
  }
  return groups.sort((a, b) => a.start.localeCompare(b.start) || a.unitId - b.unitId);
}

const selectCls =
  "w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring";

function UnitSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className={selectCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="1">Ndalem Belakang</option>
      <option value="2">Ndalem Tengah</option>
      <option value="all">Kedua unit</option>
    </select>
  );
}

function DateRangeInputs({
  start, end, onStart, onEnd, required,
}: {
  start: string; end: string; onStart: (v: string) => void; onEnd: (v: string) => void; required?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <Label className="text-xs mb-1 block">Dari tanggal</Label>
        <Input type="date" value={start} required={required} onChange={(e) => onStart(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs mb-1 block">Sampai tanggal <span className="text-muted-foreground">(opsional)</span></Label>
        <Input type="date" value={end} min={start || undefined} onChange={(e) => onEnd(e.target.value)} />
      </div>
    </div>
  );
}

type CheckResult = {
  unitIds: number[];
  start: string;
  end: string;
  days: number;
  blocked: BlockedDate[];
  bookings: Booking[];
};

export function BlockedDatesManager({
  token, bookings, blockedDates, refetchBlocked, refetchBookings,
}: {
  token: string;
  bookings: Booking[];
  blockedDates: BlockedDate[];
  refetchBlocked: () => unknown;
  refetchBookings: () => unknown;
}) {
  // ── Blokir ──
  const [blockForm, setBlockForm] = useState({ unitId: "1", start: "", end: "", reason: "" });
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockMsg, setBlockMsg] = useState<null | { ok: boolean; text: string }>(null);

  // ── Kosongkan ──
  const [clearForm, setClearForm] = useState({ unitId: "1", start: "", end: "" });
  const [clearResult, setClearResult] = useState<CheckResult | null>(null);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearMsg, setClearMsg] = useState<string | null>(null);

  const blockEnd = blockForm.end || blockForm.start;
  const blockRangeInvalid = !!blockForm.start && blockEnd < blockForm.start;
  const clearEnd = clearForm.end || clearForm.start;
  const clearRangeInvalid = !!clearForm.start && clearEnd < clearForm.start;

  async function submitBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!blockForm.start || blockRangeInvalid) return;
    setBlockLoading(true);
    setBlockMsg(null);
    try {
      const res = await adminFetch(token, "/api/admin/blocked-dates/range", "POST", {
        unitIds: unitIdsOf(blockForm.unitId),
        startDate: blockForm.start,
        endDate: blockEnd,
        reason: blockForm.reason.trim() || undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBlockMsg({ ok: false, text: data.message ?? "Gagal memblokir tanggal" });
      } else {
        const skippedNote = data.skipped > 0 ? ` (${data.skipped} sudah diblokir sebelumnya, dilewati)` : "";
        setBlockMsg({ ok: true, text: `${data.created} tanggal diblokir — ${fmtRange(blockForm.start, blockEnd)}${skippedNote}.` });
        setBlockForm((f) => ({ ...f, start: "", end: "", reason: "" }));
        refetchBlocked();
      }
    } catch {
      setBlockMsg({ ok: false, text: "Koneksi gagal, coba lagi" });
    }
    setBlockLoading(false);
  }

  // Periksa rentang memakai data yang sudah di-fetch
  function handleCheck() {
    if (!clearForm.start || clearRangeInvalid) return;
    const unitIds = unitIdsOf(clearForm.unitId);
    const start = clearForm.start;
    const end = clearEnd;
    const blocked = blockedDates
      .filter((bd) => unitIds.includes(bd.unitId) && bd.date.slice(0, 10) >= start && bd.date.slice(0, 10) <= end)
      .sort((a, b) => a.date.localeCompare(b.date));
    // Booking menempati malam [checkIn, checkOut) → bertumpang dengan [start, end] bila checkIn <= end && checkOut > start
    const overlapping = bookings
      .filter((b) => unitIds.includes(b.unitId) && b.status !== "cancelled"
        && b.checkIn.slice(0, 10) <= end && b.checkOut.slice(0, 10) > start)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    setClearMsg(null);
    setClearResult({ unitIds, start, end, days: dayCount(start, end), blocked, bookings: overlapping });
  }

  async function clearBlockedInRange() {
    if (!clearResult) return;
    setClearLoading(true);
    const res = await adminFetch(token, "/api/admin/blocked-dates/clear-range", "POST", {
      unitIds: clearResult.unitIds,
      startDate: clearResult.start,
      endDate: clearResult.end,
    });
    const data = await res.json().catch(() => ({}));
    await refetchBlocked();
    setClearLoading(false);
    if (res.ok) {
      setClearMsg(`${data.deleted} blokir dihapus — tanggal kembali tersedia.`);
      setClearResult((r) => (r ? { ...r, blocked: [] } : r));
    } else {
      setClearMsg(data.message ?? "Gagal menghapus blokir");
    }
  }

  async function cancelBooking(b: Booking) {
    if (!window.confirm(`Batalkan booking ${b.bookingRef} atas nama ${b.guestName}?\nSeluruh tanggal booking ini akan kosong.`)) return;
    setClearLoading(true);
    await adminFetch(token, `/api/admin/bookings/${b.id}`, "PATCH", { status: "cancelled" });
    await refetchBookings();
    setClearLoading(false);
    setClearResult((r) => (r ? { ...r, bookings: r.bookings.filter((x) => x.id !== b.id) } : r));
  }

  async function removeGroup(g: BlockedGroup) {
    if (g.ids.length === 1) {
      await adminFetch(token, `/api/admin/blocked-dates/${g.ids[0]}`, "DELETE");
    } else {
      await adminFetch(token, "/api/admin/blocked-dates/clear-range", "POST", {
        unitIds: [g.unitId], startDate: g.start, endDate: g.end,
      });
    }
    refetchBlocked();
  }

  const groups = groupBlocked(blockedDates);
  const blockDays = blockForm.start && !blockRangeInvalid ? dayCount(blockForm.start, blockEnd) : 0;

  return (
    <div className="space-y-6">
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
            Tandai tanggal sebagai tidak tersedia (maintenance, keperluan pribadi, dll). Isi "Sampai tanggal" untuk memblokir satu rentang sekaligus.
          </p>
          <form onSubmit={submitBlock} className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">Unit</Label>
              <UnitSelect value={blockForm.unitId} onChange={(v) => setBlockForm((f) => ({ ...f, unitId: v }))} />
            </div>
            <DateRangeInputs
              required
              start={blockForm.start}
              end={blockForm.end}
              onStart={(v) => { setBlockForm((f) => ({ ...f, start: v })); setBlockMsg(null); }}
              onEnd={(v) => { setBlockForm((f) => ({ ...f, end: v })); setBlockMsg(null); }}
            />
            <div>
              <Label className="text-xs mb-1 block">Alasan (opsional)</Label>
              <Input placeholder="Contoh: Maintenance, Acara Keluarga" value={blockForm.reason} onChange={(e) => setBlockForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>
            {blockRangeInvalid && <p className="text-xs text-red-600">Tanggal akhir tidak boleh sebelum tanggal awal.</p>}
            <Button
              type="submit"
              disabled={blockLoading || !blockForm.start || blockRangeInvalid}
              className="w-full rounded-lg h-9 text-sm bg-red-600 hover:bg-red-700"
            >
              {blockLoading ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
              {blockDays > 1 ? `Blokir ${blockDays} Hari` : "Blokir Tanggal Ini"}
            </Button>
            {blockMsg && (
              <p className={`text-xs rounded-lg px-3 py-2 ${blockMsg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {blockMsg.text}
              </p>
            )}
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
            Periksa satu tanggal atau satu rentang — hapus blokir manual sekaligus, atau batalkan booking yang ada.
          </p>

          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">Unit</Label>
              <UnitSelect value={clearForm.unitId} onChange={(v) => { setClearForm((f) => ({ ...f, unitId: v })); setClearResult(null); }} />
            </div>
            <DateRangeInputs
              start={clearForm.start}
              end={clearForm.end}
              onStart={(v) => { setClearForm((f) => ({ ...f, start: v })); setClearResult(null); }}
              onEnd={(v) => { setClearForm((f) => ({ ...f, end: v })); setClearResult(null); }}
            />
            {clearRangeInvalid && <p className="text-xs text-red-600">Tanggal akhir tidak boleh sebelum tanggal awal.</p>}
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-lg h-9 text-sm"
              onClick={handleCheck}
              disabled={!clearForm.start || clearRangeInvalid}
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" /> Periksa Tanggal
            </Button>
          </div>

          {clearResult && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {fmtRange(clearResult.start, clearResult.end)} · {clearResult.days} hari · {clearResult.unitIds.map((u) => UNIT_NAMES[u]).join(" & ")}
              </p>

              {clearMsg && (
                <p className="text-xs rounded-lg px-3 py-2 bg-green-50 text-green-700 border border-green-200">{clearMsg}</p>
              )}

              {clearResult.blocked.length === 0 && clearResult.bookings.length === 0 && (
                <div className="rounded-xl p-4 border bg-green-50 border-green-200 flex items-center gap-2 text-green-700 text-sm">
                  <Check className="w-4 h-4 shrink-0" />
                  <span className="font-medium">Semua tanggal di rentang ini sudah kosong & tersedia.</span>
                </div>
              )}

              {clearResult.blocked.length > 0 && (
                <div className="rounded-xl p-4 border bg-amber-50 border-amber-200 text-sm space-y-3">
                  <div className="text-amber-800">
                    <p className="font-semibold flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-4 h-4" /> {clearResult.blocked.length} tanggal diblokir manual
                    </p>
                    <p className="text-xs text-amber-700">
                      {groupBlocked(clearResult.blocked)
                        .map((g) => `${fmtRange(g.start, g.end)}${clearResult.unitIds.length > 1 ? ` (${UNIT_NAMES[g.unitId]})` : ""}${g.reason ? ` — ${g.reason}` : ""}`)
                        .join("; ")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full rounded-lg h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs"
                    onClick={clearBlockedInRange}
                    disabled={clearLoading}
                  >
                    {clearLoading ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                    Hapus {clearResult.blocked.length} Blokir — Jadikan Tersedia
                  </Button>
                </div>
              )}

              {clearResult.bookings.length > 0 && (
                <div className="rounded-xl p-4 border bg-red-50 border-red-200 text-sm space-y-3">
                  <p className="font-semibold flex items-center gap-1.5 text-red-800">
                    <BedDouble className="w-4 h-4" /> {clearResult.bookings.length} booking aktif di rentang ini
                  </p>
                  {clearResult.bookings.map((b) => (
                    <div key={b.id} className="rounded-lg bg-white/70 dark:bg-card/50 border border-red-100 p-3 space-y-2">
                      <div className="text-xs text-red-800 space-y-0.5">
                        <p><span className="font-medium">{b.guestName}</span> · <span className="font-mono">{b.bookingRef}</span> · {UNIT_NAMES[b.unitId] ?? b.unitName}</p>
                        <p>{b.checkIn.slice(0, 10)} → {b.checkOut.slice(0, 10)} ({b.nights} malam) · {STATUS_LABELS[b.status] ?? b.status}</p>
                      </div>
                      <Button
                        size="sm"
                        className="w-full rounded-lg h-7 bg-red-600 hover:bg-red-700 text-white text-xs"
                        onClick={() => cancelBooking(b)}
                        disabled={clearLoading}
                      >
                        <X className="w-3 h-3 mr-1" /> Batalkan Booking Ini
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-red-600">⚠️ Booking dibatalkan satu per satu (sengaja, agar tidak salah batal massal). Membatalkan membebaskan seluruh tanggal booking tsb.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Daftar Tanggal Diblokir ── */}
      <div className="bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-bold text-sm">Tanggal Diblokir Manual ({blockedDates.length})</h3>
          <span className="text-xs text-muted-foreground">Tanggal berurutan digabung · klik 🗑 untuk hapus</span>
        </div>
        {groups.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Belum ada tanggal yang diblokir manual</div>
        ) : (
          <div className="divide-y divide-border/30">
            {groups.map((g) => (
              <div key={`${g.unitId}-${g.start}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
                  <div>
                    <span className="text-sm font-medium">{fmtRange(g.start, g.end)}</span>
                    {g.start !== g.end && (
                      <span className="text-xs text-muted-foreground ml-1.5">({dayCount(g.start, g.end)} hari)</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-2">{UNIT_NAMES[g.unitId] ?? `Unit ${g.unitId}`}</span>
                    {g.reason && <span className="text-xs text-muted-foreground ml-2">— {g.reason}</span>}
                  </div>
                </div>
                <button
                  onClick={() => removeGroup(g)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                  title={g.ids.length > 1 ? `Hapus blokir ${g.ids.length} tanggal` : "Hapus blokir"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
