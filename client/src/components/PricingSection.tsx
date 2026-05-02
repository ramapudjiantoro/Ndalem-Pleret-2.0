import { motion } from "framer-motion";
import { Calendar, MessageCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/SectionHeading";

const WHATSAPP_URL = "https://wa.me/6285121314631";
const BASE_RATE = 600_000;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtIDR(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

// ── Data ──────────────────────────────────────────────────────────────────────
const TIERS = [
  {
    id: "nightly",
    label: "Per Malam",
    duration: "1–6 malam",
    normalTotal: null,
    finalTotal: null,
    perNight: BASE_RATE,
    discount: null,
    savingsAmount: null,
    note: "Tarif standar per malam",
    highlight: false,
  },
  {
    id: "week1",
    label: "1 Minggu",
    duration: "7 malam",
    normalTotal: 4_200_000,
    finalTotal: 3_990_000,
    perNight: Math.round(3_990_000 / 7),
    discount: 5,
    savingsAmount: 210_000,
    note: "Hemat 5% dari tarif normal",
    highlight: false,
  },
  {
    id: "week2",
    label: "2 Minggu",
    duration: "14 malam",
    normalTotal: 8_400_000,
    finalTotal: 7_728_000,
    perNight: Math.round(7_728_000 / 14),
    discount: 8,
    savingsAmount: 672_000,
    note: "Hemat 8% dari tarif normal",
    highlight: true, // most recommended
  },
  {
    id: "week3",
    label: "3 Minggu",
    duration: "21 malam",
    normalTotal: 12_600_000,
    finalTotal: 11_088_000,
    perNight: Math.round(11_088_000 / 21),
    discount: 12,
    savingsAmount: 1_512_000,
    note: "Hemat 12% dari tarif normal",
    highlight: false,
  },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────
interface PricingSectionProps {
  onOpenBooking?: () => void;
}

export function PricingSection({ onOpenBooking }: PricingSectionProps) {
  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Tarif Menginap"
          subtitle="Harga Transparan · Tanpa Biaya Tersembunyi"
        />

        {/* Anchor note */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center text-muted-foreground text-sm mb-10 -mt-2"
        >
          Tarif berlaku untuk <strong className="text-foreground">satu unit penuh</strong> — privasi 100%, tidak berbagi dengan tamu lain.
        </motion.p>

        {/* Tier cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className={`relative rounded-2xl border p-4 sm:p-5 flex flex-col transition-shadow hover:shadow-md ${
                tier.highlight
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                  : "bg-card border-border/60"
              }`}
            >
              {/* "Terpopuler" badge */}
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-amber-400 text-amber-900 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                  Terpopuler
                </div>
              )}

              {/* Duration label */}
              <div className={`text-xs font-semibold uppercase tracking-widest mb-3 ${tier.highlight ? "text-white/70" : "text-muted-foreground"}`}>
                {tier.label}
              </div>

              {/* Duration clarifier */}
              <div className={`text-[11px] mb-4 ${tier.highlight ? "text-white/60" : "text-muted-foreground/70"}`}>
                {tier.duration}
              </div>

              {/* ── Nightly (base) card ── */}
              {tier.id === "nightly" && (
                <div className="flex-1">
                  <div className="text-2xl sm:text-3xl font-bold font-display tabular-nums text-primary leading-none">
                    {fmtIDR(BASE_RATE)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">per malam</div>
                </div>
              )}

              {/* ── Discount cards ── */}
              {tier.id !== "nightly" && tier.normalTotal !== null && tier.finalTotal !== null && (
                <div className="flex-1">
                  {/* Original price — de-emphasized */}
                  <div className={`text-xs tabular-nums line-through leading-none mb-1 ${tier.highlight ? "text-white/40" : "text-muted-foreground/50"}`}>
                    {fmtIDR(tier.normalTotal)}
                  </div>

                  {/* Final price — prominent */}
                  <div className={`text-xl sm:text-2xl font-bold font-display tabular-nums leading-tight ${tier.highlight ? "text-white" : "text-primary"}`}>
                    {fmtIDR(tier.finalTotal)}
                  </div>

                  {/* Per-night equivalent */}
                  <div className={`text-[11px] mt-1 ${tier.highlight ? "text-white/60" : "text-muted-foreground/70"}`}>
                    ≈ {fmtIDR(tier.perNight)} / malam
                  </div>

                  {/* Savings badge */}
                  {tier.savingsAmount !== null && (
                    <div className={`mt-3 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      tier.highlight
                        ? "bg-white/15 text-white"
                        : "bg-green-50 text-green-700 border border-green-200"
                    }`}>
                      <Check className="w-2.5 h-2.5" />
                      Hemat {fmtIDR(tier.savingsAmount)}
                    </div>
                  )}
                </div>
              )}

              {/* Note */}
              <div className={`text-[10px] mt-4 pt-3 border-t ${tier.highlight ? "border-white/20 text-white/50" : "border-border/60 text-muted-foreground/60"}`}>
                {tier.note}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Long stay — contact only, no price shown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="rounded-2xl border border-border/60 bg-secondary/40 px-5 py-5 sm:px-7 sm:py-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6"
        >
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground mb-1">Extended Stay &amp; Long Stay</p>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
              Tersedia penawaran khusus untuk extended stay &amp; long stay (lebih dari 30 malam).
              Silakan hubungi kami untuk informasi lebih lanjut.
            </p>
          </div>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-5 h-9 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/5 gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Hubungi Kami
            </Button>
          </a>
        </motion.div>

        {/* Deposit + CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-border/50"
        >
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            + Deposit jaminan Rp 500.000 — dikembalikan setelah check-out &amp; pengecekan unit.
          </p>
          <Button
            onClick={onOpenBooking}
            className="rounded-full px-6 h-10 text-sm font-semibold gap-2 shrink-0"
          >
            <Calendar className="w-4 h-4" />
            Cek Ketersediaan & Pesan
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
