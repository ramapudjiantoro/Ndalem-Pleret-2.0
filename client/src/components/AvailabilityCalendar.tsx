import { useState } from "react";
import { motion } from "framer-motion";
import { format, getDaysInMonth, addMonths, isBefore, isToday } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAllUnitsAvailability } from "@/hooks/use-availability";
import { useUnits } from "@/hooks/use-units";
import { SectionHeading } from "./SectionHeading";

const DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function CalendarGrid({
  month, year, unavailableDates,
}: {
  month: number; year: number; unavailableDates: string[];
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const unavailSet = new Set(unavailableDates);
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = getDaysInMonth(new Date(year, month));

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS_ID.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} className="h-8" />;
          const date = new Date(year, month, day);
          const ds = format(date, "yyyy-MM-dd");
          const isPast = isBefore(date, today);
          const isUnavailable = unavailSet.has(ds);
          const isCurrentDay = isToday(date);

          return (
            <div
              key={ds}
              title={isUnavailable ? "Tidak tersedia" : isPast ? "" : "Tersedia"}
              className={[
                "h-8 rounded-md flex items-center justify-center text-xs font-medium transition-colors",
                isPast && "text-muted-foreground/30",
                !isPast && isUnavailable && "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
                !isPast && !isUnavailable && "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50",
                isCurrentDay && !isUnavailable && "ring-1 ring-green-400",
              ].filter(Boolean).join(" ")}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AvailabilityCalendarProps {
  onOpenBooking: (unitId?: number) => void;
}

export function AvailabilityCalendar({ onOpenBooking }: AvailabilityCalendarProps) {
  const { data: units = [] } = useUnits();
  const unitIds = units.map((u) => u.id);
  const { data: availabilityMap = {}, isLoading } = useAllUnitsAvailability(unitIds);

  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(0);

  const selectedUnit = units[selectedUnitIndex];
  const selectedUnitUnavailable = selectedUnit ? (availabilityMap[selectedUnit.id] ?? []) : [];

  const today = new Date();
  const canGoPrev =
    viewMonth.getFullYear() > today.getFullYear() ||
    (viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() > today.getMonth());

  // Count available days this month
  const daysInMonth = getDaysInMonth(viewMonth);
  let availableCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d);
    if (isBefore(date, today)) continue;
    const ds = format(date, "yyyy-MM-dd");
    if (!selectedUnitUnavailable.includes(ds)) availableCount++;
  }

  return (
    <section id="availability" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Cek Ketersediaan"
          subtitle="Kalender Booking"
        />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Left: Legend + Unit Selector + Stats */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Unit Tabs */}
            {units.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">Pilih Unit:</p>
                <div className="flex flex-wrap gap-2">
                  {units.map((unit, idx) => (
                    <button
                      key={unit.id}
                      onClick={() => setSelectedUnitIndex(idx)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedUnitIndex === idx
                          ? "bg-primary text-white shadow-md"
                          : "bg-secondary text-foreground hover:bg-secondary/70"
                      }`}
                    >
                      {unit.name.replace(" — Ndalem Pleret", "")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Availability stat */}
            <div className="bg-white dark:bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tersedia bulan ini</p>
                  <p className="text-2xl font-bold text-foreground">
                    {isLoading ? "—" : `${availableCount} malam`}
                  </p>
                </div>
              </div>
              {availableCount <= 5 && availableCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 font-medium dark:bg-amber-900/30 dark:border-amber-700/40 dark:text-amber-300">
                  ⚠️ Hanya tersisa <strong>{availableCount} malam</strong> bulan ini — segera pesan!
                </div>
              )}
              {availableCount === 0 && !isLoading && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-medium dark:bg-red-900/30 dark:border-red-700/40 dark:text-red-300">
                  Unit ini penuh bulan ini. Cek bulan berikutnya.
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="bg-white dark:bg-card rounded-2xl border border-border/50 p-5 shadow-sm space-y-3">
              <p className="text-sm font-semibold text-foreground">Keterangan:</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-green-50 border border-green-200 flex items-center justify-center text-xs text-green-700 dark:bg-green-900/30 dark:border-green-700/40 dark:text-green-400">12</div>
                  <span className="text-muted-foreground">Tersedia — bisa dipesan</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-red-100 flex items-center justify-center text-xs text-red-600 dark:bg-red-900/40 dark:text-red-400">12</div>
                  <span className="text-muted-foreground">Sudah dipesan / tidak tersedia</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded flex items-center justify-center text-xs text-muted-foreground/40">12</div>
                  <span className="text-muted-foreground">Tanggal sudah lewat</span>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full rounded-xl h-12 font-semibold text-base shadow-lg"
              onClick={() => onOpenBooking(selectedUnit?.id)}
            >
              Pesan {selectedUnit?.name.replace(" — Ndalem Pleret", "") ?? "Unit"} Sekarang
            </Button>
          </motion.div>

          {/* Right: Calendar */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-3"
          >
            <div className="bg-white dark:bg-card rounded-2xl border border-border/50 shadow-sm p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
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

              {isLoading ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  Memuat kalender...
                </div>
              ) : (
                <CalendarGrid
                  month={viewMonth.getMonth()}
                  year={viewMonth.getFullYear()}
                  unavailableDates={selectedUnitUnavailable}
                />
              )}

              {/* Next month preview */}
              <div className="mt-8 pt-6 border-t border-border/40">
                <p className="text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">Bulan Berikutnya</p>
                <CalendarGrid
                  month={addMonths(viewMonth, 1).getMonth()}
                  year={addMonths(viewMonth, 1).getFullYear()}
                  unavailableDates={selectedUnitUnavailable}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
