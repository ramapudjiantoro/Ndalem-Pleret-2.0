import { useState, useEffect } from "react";
import { RefreshCw, Check, X, Banknote, Calendar, User, Phone, Mail, BedDouble, ChevronDown, ChevronUp, Trash2, AlertTriangle, StickyNote, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatIDR } from "@shared/format";
import { computePricing } from "@shared/pricing";
import { Booking, STATUS_COLORS, PAYMENT_COLORS, STATUS_LABELS, PAYMENT_LABELS } from "./types";
import { adminFetch } from "./api";

// ─── Booking Row ──────────────────────────────────────────────────────────────
export function BookingRow({ booking, token, onRefresh }: { booking: Booking; token: string; onRefresh: () => void }) {
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

  const pricePerNight = booking.pricePerNight ?? (booking.nights > 0 ? Math.round(booking.totalPrice / booking.nights) : 600_000);
  const bookingGrand = computePricing(pricePerNight, booking.nights).grandTotal;
  const draftNights = (() => {
    const d1 = new Date(dateDraft.checkIn + "T12:00:00Z");
    const d2 = new Date(dateDraft.checkOut + "T12:00:00Z");
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  })();
  const draftTotal = computePricing(pricePerNight, draftNights).grandTotal;

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
        const res = await adminFetch(token, `/api/admin/bookings/${booking.id}/check-dates?checkIn=${dateDraft.checkIn}&checkOut=${dateDraft.checkOut}`);
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
    await adminFetch(token, `/api/admin/bookings/${booking.id}`, "PATCH", { checkIn: dateDraft.checkIn, checkOut: dateDraft.checkOut });
    setLoading(false);
    setEditingDates(false);
    setDateAvailability("idle");
    onRefresh();
  }

  async function update(field: "status" | "paymentStatus", value: string) {
    setLoading(true);
    await adminFetch(token, `/api/admin/bookings/${booking.id}`, "PATCH", { [field]: value });
    setLoading(false);
    onRefresh();
  }

  async function saveAdminNotes() {
    setLoading(true);
    await adminFetch(token, `/api/admin/bookings/${booking.id}`, "PATCH", { adminNotes: notesDraft });
    setLoading(false);
    setEditingNotes(false);
    onRefresh();
  }

  async function deleteBooking() {
    setLoading(true);
    await adminFetch(token, `/api/admin/bookings/${booking.id}`, "DELETE");
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
          <p className="text-xs text-muted-foreground">{booking.unitName} · {booking.nights} malam · {formatIDR(bookingGrand)}</p>
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
                    {(draftNights !== booking.nights || draftTotal !== bookingGrand) && (
                      <span className="text-amber-600 dark:text-amber-400 text-[10px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-1.5 py-0.5 rounded-full">
                        sebelumnya {booking.nights} malam · {formatIDR(bookingGrand)}
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
                `\n\n📧 Panduan check-in lengkap sudah kami kirim ke email Anda. Jika tidak ada di inbox, silakan cek folder *Promotions* atau *Spam*.\n\nSelamat menginap & jangan ragu hubungi kami jika ada pertanyaan! 😊\n\n_pesan ini dikirim otomatis_`
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
