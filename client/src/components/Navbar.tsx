import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-scroll";
import { Menu, X, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavbarProps {
  onOpenBooking?: () => void;
}

const NAV_ITEMS = [
  { name: "Tentang", to: "about" },
  { name: "Unit", to: "units" },
  { name: "Fasilitas", to: "facilities" },
  { name: "Ketersediaan", to: "availability" },
  { name: "FAQ", to: "faq" },
  { name: "Lokasi", to: "location" },
];

export function Navbar({ onOpenBooking }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const solidNav = isScrolled || isMobileMenuOpen;

  return (
    <nav
      className={cn(
        "fixed z-50 transition-all duration-300 ease-in-out overflow-hidden",
        solidNav
          ? "top-4 left-4 right-4 rounded-2xl bg-card/95 dark:bg-card/95 backdrop-blur-md shadow-xl border border-border/40 py-2 md:py-3"
          : "top-0 left-0 right-0 bg-transparent py-5 text-white"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="hero" smooth duration={500} className="cursor-pointer flex items-center gap-2.5">
            <img
              src="/logo.jpg"
              alt="Ndalem Pleret"
              className={cn(
                "w-9 h-9 rounded-full object-cover ring-2 transition-all duration-300",
                isScrolled ? "ring-primary/20" : "ring-white/40"
              )}
            />
            <span className="font-display font-bold text-xl tracking-wide">Ndalem Pleret</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6 gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.name}
                to={item.to}
                smooth duration={500} offset={-80}
                className={cn(
                  "cursor-pointer text-sm font-medium hover:text-primary transition-colors",
                  !isScrolled && "hover:text-white/80"
                )}
              >
                {item.name}
              </Link>
            ))}
            <ThemeToggle
              className={cn(solidNav ? "" : "text-white hover:bg-white/20 hover:text-white")}
            />
            <Button
              onClick={onOpenBooking}
              variant={solidNav ? "default" : "secondary"}
              className={cn(
                "rounded-full px-6 font-semibold shadow-lg hover:shadow-xl transition-all",
                !solidNav && "bg-white text-primary hover:bg-white/90"
              )}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Pesan Sekarang
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-1">
            <ThemeToggle
              className={cn(solidNav ? "" : "text-white hover:bg-white/20 hover:text-white")}
            />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md focus:outline-none"
            >
              {isMobileMenuOpen ? (
                <X className={cn("h-6 w-6", solidNav ? "text-foreground" : "text-white")} />
              ) : (
                <Menu className={cn("h-6 w-6", solidNav ? "text-foreground" : "text-white")} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu — inside the pill, not absolutely positioned */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="md:hidden overflow-hidden"
          >
            <div className="border-t border-border/20 px-4 pb-4 pt-2 flex flex-col gap-0.5">
              {NAV_ITEMS.map((item, i) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.055, duration: 0.18, ease: "easeOut" }}
                >
                  <Link
                    to={item.to}
                    smooth duration={500} offset={-80}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-foreground font-medium py-2.5 px-4 hover:bg-secondary/70 dark:hover:bg-secondary/30 rounded-xl transition-colors cursor-pointer text-sm"
                  >
                    {item.name}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: NAV_ITEMS.length * 0.055 + 0.04, duration: 0.18 }}
                className="pt-2 mt-1 border-t border-border/20"
              >
                <Button
                  className="w-full rounded-xl h-11 font-semibold"
                  onClick={() => { setIsMobileMenuOpen(false); onOpenBooking?.(); }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Pesan Sekarang
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
