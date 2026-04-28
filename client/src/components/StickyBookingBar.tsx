import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriceDisplay } from "@/components/PriceDisplay";

interface StickyBookingBarProps {
  onOpenBooking: () => void;
}

export function StickyBookingBar({ onOpenBooking }: StickyBookingBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Show after scrolling past the hero (roughly 80vh)
      setVisible(window.scrollY > window.innerHeight * 0.75);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
        >
          <div className="bg-white dark:bg-card border-t border-border shadow-2xl px-4 py-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Mulai dari</p>
              <div className="flex items-end gap-1">
                <PriceDisplay currentPrice={600_000} size="sm" />
                <span className="text-xs text-muted-foreground pb-0.5">/malam</span>
              </div>
            </div>
            <Button
              onClick={onOpenBooking}
              className="rounded-xl px-6 h-11 font-semibold text-sm shadow-lg shrink-0"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Pesan Sekarang
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Desktop version — floats on right side
export function FloatingBookingButton({ onOpenBooking }: StickyBookingBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.75);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed right-6 bottom-6 z-40 hidden md:block"
        >
          <Button
            onClick={onOpenBooking}
            size="lg"
            className="rounded-full h-14 px-6 shadow-2xl font-semibold"
          >
            <Calendar className="w-5 h-5 mr-2" />
            Pesan Sekarang
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
