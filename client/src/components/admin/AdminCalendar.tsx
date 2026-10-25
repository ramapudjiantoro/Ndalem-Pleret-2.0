import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { formatIDR } from "@shared/format";
import { getDaysInMonth, addMonths, isBefore, isToday, format } from "date-fns";
import { Booking, BlockedDate, grandTotalOf, STATUS_COLORS, STATUS_LABELS } from "./types";

// ─── Admin Calendar Preview ───────────────────────────────────────────────────
const DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

/** Expands a booking's check-in → check-out range into individual date strings */
export function expandBookingDates(bookings: Booking[], unitId: number): Map<string, Booking> {
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

export function AdminCalendarPreview({ bookings, blockedDates }: { bookings: Booking[]; blockedDates: BlockedDate[] }) {
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
                  <div className="text-xs font-semibold">{formatIDR(grandTotalOf(b))}</div>
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
