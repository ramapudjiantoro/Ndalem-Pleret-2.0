import { motion } from "framer-motion";
import { formatIDR } from "@/hooks/use-units";

// Harga "asli" yang dicoret — ubah di sini kalau ingin ganti
const ORIGINAL_PRICE = 850_000;

interface PriceDisplayProps {
  currentPrice: number;
  originalPrice?: number;
  /** "dark" = teks putih (untuk background gelap/primary)
   *  "light" = teks primary (untuk background terang) */
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  /** Extra className untuk wrapper div (e.g. "text-right") */
  className?: string;
}

const SIZE = {
  sm: { orig: "text-xs",  curr: "text-sm  font-bold" },
  md: { orig: "text-xs",  curr: "text-xl  font-bold" },
  lg: { orig: "text-sm",  curr: "text-2xl font-bold" },
} as const;

// Animasi berkedut: bergetar cepat lalu diam, lalu ulangi tiap ~4 detik
const jitter = {
  animate: {
    x: [0, -2, 3, -2, 1, -1, 1, -1, 0],
    y: [0,  1, -1,  0, 1, -1, 0,  1, 0],
  },
  transition: {
    duration: 0.5,
    repeat: Infinity,
    repeatDelay: 3.8,
    ease: "easeInOut",
  },
};

export function PriceDisplay({
  currentPrice,
  originalPrice = ORIGINAL_PRICE,
  variant = "light",
  size = "md",
  className = "",
}: PriceDisplayProps) {
  const isDark = variant === "dark";
  const s = SIZE[size];

  return (
    <div className={className}>
      {/* Harga asli dicoret */}
      <div
        className={`leading-none mb-0.5 line-through tabular-nums ${s.orig} ${
          isDark ? "text-white/50" : "text-muted-foreground/70"
        }`}
      >
        {formatIDR(originalPrice)}
      </div>

      {/* Harga sekarang — berkedut */}
      <motion.div
        className={`leading-none font-display tabular-nums ${s.curr} ${
          isDark ? "text-white" : "text-primary"
        }`}
        animate={jitter.animate}
        transition={jitter.transition}
      >
        {formatIDR(currentPrice)}
      </motion.div>
    </div>
  );
}
