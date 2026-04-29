import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInCalendarDays, addDays, isBefore, isAfter, isToday, isSameDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { X, ChevronLeft, ChevronRight, Check, Copy, ExternalLink, Loader2, AlertTriangle, BedDouble, Users, Calendar, Phone, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUnits, formatIDR } from "@/hooks/use-units";
import { PriceDisplay } from "@/components/PriceDisplay";
import { useAvailability } from "@/hooks/use-availability";
import { useQueryClient } from "@tanstack/react-query";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedUnitId?: number | null;
}

type Step = 1 | 2 | 3 | 4; // 1=unit+dates, 2=guest info, 3=payment, 4=confirmation

const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

// Preview foto ruang keluarga per unit (ID sesuai DB)
const UNIT_PREVIEW: Record<number, string> = {
  1: "/belakang/ruang-keluarga.jpg",
  2: "/tengah/ruang-keluarga.jpg",
};
const DAYS_ID = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];
const DEPOSIT = 500000;
const WHATSAPP_NUMBER = "6285121314631";

// ─── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar({
  month, year, checkIn, checkOut, unavailableDates, onSelectDate, hoveredDate, setHoveredDate,
}: {
  month: number; year: number;
  checkIn: Date | null; checkOut: Date | null;
  unavailableDates: string[];
  onSelectDate: (d: Date) => void;
  hoveredDate: Date | null;
  setHoveredDate: (d: Date | null) => void;
}) {
  const today = new Date(); today.setHours(0,0,0,0);
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();

  const unavailSet = new Set(unavailableDates);

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));

  function getStatus(date: Date) {
    if (!date) return "empty";
    const ds = format(date, "yyyy-MM-dd");
    if (isBefore(date, today)) return "past";
    if (unavailSet.has(ds)) return "unavailable";

    const rangeEnd = hoveredDate && checkIn && !checkOut ? hoveredDate : checkOut;
    if (checkIn && isSameDay(date, checkIn)) return "check-in";
    if (checkOut && isSameDay(date, checkOut)) return "check-out";
    if (checkIn && rangeEnd && date > checkIn && date < rangeEnd) return "in-range";
    return "available";
  }

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS_ID.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} />;
          const status = getStatus(date);
          const isDisabled = status === "past" || status === "unavailable";
          return (
            <button
              key={date.toISOString()}
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelectDate(date)}
              onMouseEnter={() => !isDisabled && setHoveredDate(date)}
              onMouseLeave={() => setHoveredDate(null)}
              className={[
                "h-9 w-full text-xs rounded-lg transition-colors font-medium relative",
                status === "past" && "text-muted-foreground/25 cursor-not-allowed pointer-events-none",
                status === "unavailable" && "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed pointer-events-none select-none",
                status === "available" && "hover:bg-primary/10 text-foreground cursor-pointer",
                status === "check-in" && "bg-primary text-white rounded-l-lg",
                status === "check-out" && "bg-primary text-white rounded-r-lg",
                status === "in-range" && "bg-primary/15 text-primary rounded-none",
                isToday(date) && status === "available" && "border border-primary/40",
              ].filter(Boolean).join(" ")}
            >
              {status === "unavailable" ? (
                <span className="relative">
                  {date.getDate()}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="block w-4 h-px bg-gray-300 dark:bg-gray-600 rotate-45" />
                  </span>
                </span>
              ) : date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN MODAL ───────────────────────────────────────────────────────────────
export function BookingModal({ isOpen, onClose, preselectedUnitId }: BookingModalProps) {
  const queryClient = useQueryClient();
  const { data: units = [], isLoading: unitsLoading } = useUnits();

  const [step, setStep] = useState<Step>(1);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(preselectedUnitId ?? null);
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [guestForm, setGuestForm] = useState({ name: "", phone: "", email: "", guestCount: "2", notes: "" });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const { data: availData } = useAvailability(selectedUnitId, 4);
  const unavailableDates = availData?.unavailableDates ?? [];

  const selectedUnit = units.find((u) => u.id === selectedUnitId) ?? null;
  const nights = checkIn && checkOut ? differenceInCalendarDays(checkOut, checkIn) : 0;
  const subtotal = selectedUnit ? selectedUnit.pricePerNight * nights : 0;
  const total = subtotal + (nights > 0 ? DEPOSIT : 0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedUnitId(preselectedUnitId ?? null);
      setCheckIn(null); setCheckOut(null);
      setGuestForm({ name: "", phone: "", email: "", guestCount: "2", notes: "" });
      setFormError(""); setBookingResult(null);
    }
  }, [isOpen, preselectedUnitId]);

  function handleDateSelect(date: Date) {
    if (!checkIn || (checkIn && checkOut)) {
      // First click — always set as check-in
      setCheckIn(date); setCheckOut(null);
    } else {
      // Second click — must be STRICTLY AFTER check-in (minimum 1 night)
      if (!isAfter(date, checkIn)) {
        // Clicked same day or earlier — restart selection from this date
        setCheckIn(date); setCheckOut(null); return;
      }
      // Reject if any date in the range is unavailable
      const cur = addDays(checkIn, 1);
      while (isBefore(cur, date)) {
        if (unavailableDates.includes(format(cur, "yyyy-MM-dd"))) {
          // Range crosses an unavailable date — start over from clicked date
          setCheckIn(date); setCheckOut(null); return;
        }
        cur.setDate(cur.getDate() + 1);
      }
      setCheckOut(date);
    }
  }

  function handleStep1Continue() {
    if (!selectedUnitId) { setFormError("Pilih unit terlebih dahulu"); return; }
    if (!checkIn || !checkOut) { setFormError("Pilih tanggal check-in dan check-out"); return; }
    if (!isAfter(checkOut, checkIn)) { setFormError("Check-out harus minimal 1 malam setelah check-in"); return; }

    // Validate entire range against known unavailable dates
    const cur = new Date(checkIn);
    while (cur < checkOut) {
      if (unavailableDates.includes(format(cur, "yyyy-MM-dd"))) {
        setCheckIn(null); setCheckOut(null);
        setFormError("Sebagian tanggal yang Anda pilih sudah penuh. Silakan pilih tanggal lain.");
        return;
      }
      cur.setDate(cur.getDate() + 1);
    }

    setFormError(""); setStep(2);
  }

  function handleStep2Continue() {
    const { name, phone, email, guestCount } = guestForm;
    if (!name.trim() || name.trim().length < 2) { setFormError("Nama harus minimal 2 karakter"); return; }
    if (!phone.trim() || phone.trim().length < 9) { setFormError("Nomor HP tidak valid"); return; }
    if (!email.trim() || !email.includes("@")) { setFormError("Email tidak valid"); return; }
    if (!guestCount || parseInt(guestCount) < 1) { setFormError("Jumlah tamu harus diisi"); return; }
    setFormError(""); setStep(3);
  }

  async function handleSubmitBooking() {
    if (!selectedUnitId || !checkIn || !checkOut) return;
    setIsSubmitting(true); setFormError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: selectedUnitId,
          guestName: guestForm.name,
          guestPhone: guestForm.phone,
          guestEmail: guestForm.email,
          checkIn: format(checkIn, "yyyy-MM-dd"),
          checkOut: format(checkOut, "yyyy-MM-dd"),
          guestCount: parseInt(guestForm.guestCount),
          notes: guestForm.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Dates were taken between selection and submission — go back to step 1
          queryClient.invalidateQueries({ queryKey: ["availability"] });
          setCheckIn(null); setCheckOut(null);
          setFormError("Tanggal tersebut baru saja dipesan oleh tamu lain. Pilih tanggal lain.");
          setStep(1);
        } else {
          setFormError(data.message || "Terjadi kesalahan, coba lagi");
        }
        return;
      }
      setBookingResult(data);
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      setStep(4);
    } catch {
      setFormError("Koneksi gagal, periksa internet Anda");
    } finally {
      setIsSubmitting(false);
    }
  }

  function copyRef() {
    if (bookingResult?.bookingRef) {
      navigator.clipboard.writeText(bookingResult.bookingRef);
      setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2000);
    }
  }

  function buildWhatsApp() {
    if (!bookingResult) return "#";
    const msg = encodeURIComponent(
      `Halo Ndalem Pleret! Saya baru saja melakukan pemesanan dengan kode: *${bookingResult.bookingRef}*\n\n` +
      `Nama: ${guestForm.name}\n` +
      `Unit: ${selectedUnit?.name}\n` +
      `Check-in: ${checkIn ? format(checkIn, "dd MMMM yyyy", { locale: idLocale }) : ""}\n` +
      `Check-out: ${checkOut ? format(checkOut, "dd MMMM yyyy", { locale: idLocale }) : ""}\n` +
      `Total: ${formatIDR(bookingResult.totalPrice + DEPOSIT)}\n\n` +
      `Saya sudah melakukan pembayaran via QRIS. Mohon konfirmasinya. Terima kasih!`
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.97 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="relative z-10 w-full sm:max-w-2xl bg-background rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-white dark:bg-card">
            <div>
              <h2 className="text-lg font-bold font-display text-foreground">
                {step === 1 && "Pilih Tanggal"}
                {step === 2 && "Detail Tamu"}
                {step === 3 && "Pembayaran"}
                {step === 4 && "Pemesanan Berhasil!"}
              </h2>
              {step < 4 && (
                <div className="flex gap-1.5 mt-1">
                  {[1,2,3].map((s) => (
                    <div key={s} className={`h-1 rounded-full transition-all ${s <= step ? "bg-primary w-6" : "bg-muted w-3"}`} />
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">

            {/* ── STEP 1: Unit + Dates ── */}
            {step === 1 && (
              <div className="p-6 space-y-6">
                {/* Unit Selection */}
                <div>
                  <Label className="text-sm font-semibold text-foreground mb-3 block">Pilih Unit</Label>
                  {unitsLoading ? (
                    <div className="flex gap-2"><Loader2 className="animate-spin w-4 h-4" /><span className="text-sm text-muted-foreground">Memuat unit...</span></div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {units.map((unit) => (
                        <button
                          key={unit.id}
                          onClick={() => setSelectedUnitId(unit.id)}
                          className={`relative text-left rounded-xl border-2 transition-all overflow-hidden ${selectedUnitId === unit.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-white dark:bg-card/60"}`}
                        >
                          {/* Preview foto ruang keluarga */}
                          {UNIT_PREVIEW[unit.id] && (
                            <div className="w-full h-28 overflow-hidden">
                              <img
                                src={UNIT_PREVIEW[unit.id]}
                                alt={`Ruang keluarga ${unit.name}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="p-3">
                            <div className="font-semibold text-sm text-foreground">{unit.name}</div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> {unit.bedrooms} kamar</span>
                              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> maks {unit.maxGuests} tamu</span>
                            </div>
                            <div className="mt-1.5 flex items-end gap-1">
                              <PriceDisplay currentPrice={unit.pricePerNight} size="sm" />
                              <span className="text-xs text-muted-foreground pb-0.5">/malam</span>
                            </div>
                          </div>
                          {selectedUnitId === unit.id && (
                            <div className="absolute top-2 right-2 bg-primary rounded-full p-0.5"><Check className="w-3 h-3 text-white" /></div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date Picker */}
                <div>
                  <Label className="text-sm font-semibold text-foreground mb-3 block">Pilih Tanggal Menginap</Label>
                  <div className="flex items-center gap-3 mb-2 text-xs flex-wrap">
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-primary"></span> Dipilih</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-primary/15 border border-primary/30"></span> Rentang</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600"></span> Penuh</span>
                  </div>

                  {/* Error — ditampilkan tepat di atas kalender agar terlihat tanpa scroll */}
                  {formError && (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 px-3 py-2 rounded-lg mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{formError}
                    </div>
                  )}

                  {/* Calendar nav */}
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => setCalendarMonth((m) => { const n = new Date(m); n.setMonth(n.getMonth() - 1); return n; })}
                      disabled={calendarMonth <= new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
                      className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-semibold">{MONTHS_ID[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
                    <button onClick={() => setCalendarMonth((m) => { const n = new Date(m); n.setMonth(n.getMonth() + 1); return n; })}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <MiniCalendar
                    month={calendarMonth.getMonth()}
                    year={calendarMonth.getFullYear()}
                    checkIn={checkIn} checkOut={checkOut}
                    unavailableDates={unavailableDates}
                    onSelectDate={handleDateSelect}
                    hoveredDate={hoveredDate}
                    setHoveredDate={setHoveredDate}
                  />

                  {/* Date summary */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-xl border ${checkIn ? "bg-primary/5 border-primary/30" : "bg-muted border-border"}`}>
                      <div className="text-xs text-muted-foreground mb-0.5">Check-in</div>
                      <div className="font-semibold text-sm">{checkIn ? format(checkIn, "dd MMM yyyy", { locale: idLocale }) : "—"}</div>
                    </div>
                    <div className={`p-3 rounded-xl border ${checkOut ? "bg-primary/5 border-primary/30" : "bg-muted border-border"}`}>
                      <div className="text-xs text-muted-foreground mb-0.5">Check-out</div>
                      <div className="font-semibold text-sm">{checkOut ? format(checkOut, "dd MMM yyyy", { locale: idLocale }) : "—"}</div>
                    </div>
                  </div>

                  {nights > 0 && selectedUnit && (
                    <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-xl text-sm">
                      <span className="font-semibold text-primary">{nights} malam</span>
                      <span className="text-muted-foreground"> × {formatIDR(selectedUnit.pricePerNight)} = </span>
                      <span className="font-bold text-foreground">{formatIDR(subtotal)}</span>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ── STEP 2: Guest Info ── */}
            {step === 2 && (
              <div className="p-6 space-y-4">
                <div className="p-4 bg-secondary/50 rounded-xl text-sm space-y-1 mb-2">
                  <div className="flex items-center gap-2"><BedDouble className="w-4 h-4 text-primary" /><span className="font-semibold">{selectedUnit?.name}</span></div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{checkIn && format(checkIn, "dd MMM", { locale: idLocale })} → {checkOut && format(checkOut, "dd MMM yyyy", { locale: idLocale })} · {nights} malam</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="guestName" className="text-sm font-medium">Nama Lengkap *</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="guestName" placeholder="Nama pemesan" className="pl-9"
                        value={guestForm.name} onChange={(e) => setGuestForm((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="guestPhone" className="text-sm font-medium">Nomor WhatsApp / HP *</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="guestPhone" placeholder="08XXXXXXXXXX" className="pl-9" type="tel"
                        value={guestForm.phone} onChange={(e) => setGuestForm((f) => ({ ...f, phone: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="guestEmail" className="text-sm font-medium">Alamat Email *</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="guestEmail" placeholder="email@anda.com" className="pl-9" type="email"
                        value={guestForm.email} onChange={(e) => setGuestForm((f) => ({ ...f, email: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="guestCount" className="text-sm font-medium">Jumlah Tamu</Label>
                    <div className="relative mt-1">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="guestCount" placeholder="2" className="pl-9" type="number" min="1" max={selectedUnit?.maxGuests ?? 10}
                        value={guestForm.guestCount} onChange={(e) => setGuestForm((f) => ({ ...f, guestCount: e.target.value }))} />
                    </div>
                    {selectedUnit && <p className="text-xs text-muted-foreground mt-1">Kapasitas maksimal {selectedUnit.maxGuests} orang</p>}
                  </div>
                  <div>
                    <Label htmlFor="notes" className="text-sm font-medium">Catatan (opsional)</Label>
                    <textarea id="notes" rows={2}
                      placeholder="Permintaan khusus, perkiraan jam tiba, dll..."
                      className="mt-1 w-full border border-input rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                      value={guestForm.notes} onChange={(e) => setGuestForm((f) => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 p-3 rounded-lg">
                    <AlertTriangle className="w-4 h-4 shrink-0" />{formError}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 3: Payment Summary + QRIS ── */}
            {step === 3 && (
              <div className="p-6 space-y-5">
                {/* Order Summary */}
                <div className="bg-secondary/40 rounded-xl p-4 space-y-2 text-sm">
                  <h3 className="font-bold text-foreground mb-3">Ringkasan Pemesanan</h3>
                  <div className="flex justify-between"><span className="text-muted-foreground">{selectedUnit?.name}</span></div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{checkIn && format(checkIn, "dd MMM", { locale: idLocale })} – {checkOut && format(checkOut, "dd MMM yyyy", { locale: idLocale })}</span>
                    <span className="font-medium">{nights} malam</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{formatIDR(selectedUnit?.pricePerNight ?? 0)} × {nights} malam</span>
                    <span>{formatIDR(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-muted-foreground leading-snug">
                      Deposit jaminan
                      <span className="block text-xs text-muted-foreground/70">Dikembalikan setelah check-out &amp; pengecekan unit</span>
                    </span>
                    <span className="shrink-0">{formatIDR(DEPOSIT)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border font-bold text-base">
                    <span>Total Pembayaran</span>
                    <span className="text-primary">{formatIDR(total)}</span>
                  </div>
                </div>

                {/* QRIS */}
                <div className="bg-white dark:bg-card border border-border rounded-xl p-4 text-center">
                  <div className="text-sm font-semibold mb-2 text-foreground">Scan QRIS untuk Membayar</div>
                  <div className="text-xl font-bold text-primary mb-3">{formatIDR(total)}</div>
                  <div className="mx-auto w-52 h-52 rounded-xl overflow-hidden border border-border mb-3 bg-white dark:bg-card p-1">
                    <img src="/qris.jpg" alt="QRIS Ndalem Pleret" className="w-full h-full object-contain" />
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    Scan kode QR di atas menggunakan aplikasi perbankan atau e-wallet Anda (GoPay, OVO, Dana, dll.)
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="font-semibold">Langkah selanjutnya:</div>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Bayar sesuai nominal di atas via QRIS</li>
                    <li>Klik tombol "Konfirmasi Pemesanan" di bawah</li>
                    <li>Kirim bukti bayar ke WhatsApp kami</li>
                    <li>Booking dikonfirmasi dalam 1×24 jam</li>
                  </ol>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 p-3 rounded-lg">
                    <AlertTriangle className="w-4 h-4 shrink-0" />{formError}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 4: Confirmation ── */}
            {step === 4 && bookingResult && (
              <div className="p-6 space-y-5">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold font-display text-foreground">Pemesanan Diterima!</h3>
                  <p className="text-muted-foreground text-sm mt-2">Simpan kode pemesanan Anda dan kirim bukti pembayaran ke WhatsApp kami untuk konfirmasi.</p>
                </div>

                {/* Booking Reference */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-widest">Kode Pemesanan</div>
                  <div className="text-2xl font-bold font-mono text-primary tracking-wider">{bookingResult.bookingRef}</div>
                  <button onClick={copyRef} className="mt-2 flex items-center gap-1.5 mx-auto text-xs text-muted-foreground hover:text-primary transition-colors">
                    {copiedRef ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                    {copiedRef ? "Tersalin!" : "Salin kode"}
                  </button>
                </div>

                {/* Summary */}
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Unit", value: selectedUnit?.name },
                    { label: "Tamu", value: guestForm.name },
                    { label: "Check-in", value: checkIn ? format(checkIn, "EEEE, dd MMMM yyyy", { locale: idLocale }) : "" },
                    { label: "Check-out", value: checkOut ? format(checkOut, "EEEE, dd MMMM yyyy", { locale: idLocale }) : "" },
                    { label: "Durasi", value: `${nights} malam` },
                    { label: "Total Bayar", value: formatIDR(total), bold: true },
                  ].map(({ label, value, bold }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={bold ? "font-bold text-primary" : "font-medium"}>{value}</span>
                    </div>
                  ))}
                </div>

                <a href={buildWhatsApp()} target="_blank" rel="noopener noreferrer" className="block">
                  <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white h-12 rounded-xl font-semibold">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Kirim Konfirmasi ke WhatsApp
                  </Button>
                </a>

                <p className="text-xs text-center text-muted-foreground">
                  Bukti pembayaran & kode booking akan kami proses dalam 1×24 jam.
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {step < 4 && (
            <div className="px-6 py-4 border-t border-border/50 bg-white dark:bg-card flex gap-3">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep((s) => (s - 1) as Step)} className="flex-1 rounded-xl h-12">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
                </Button>
              )}
              {step === 1 && (
                <Button onClick={handleStep1Continue} className="flex-1 rounded-xl h-12 font-semibold text-base">
                  Lanjutkan <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {step === 2 && (
                <Button onClick={handleStep2Continue} className="flex-1 rounded-xl h-12 font-semibold text-base">
                  Lanjut ke Pembayaran <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {step === 3 && (
                <Button onClick={handleSubmitBooking} disabled={isSubmitting} className="flex-1 rounded-xl h-12 font-semibold text-base">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</> : "Konfirmasi Pemesanan"}
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
