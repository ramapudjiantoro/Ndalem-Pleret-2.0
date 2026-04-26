import { useState, useEffect } from "react";
import { Link } from "react-scroll";
import { Menu, X, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavbarProps {
  onOpenBooking?: () => void;
}

const NAV_ITEMS = [
  { name: "Beranda", to: "hero" },
  { name: "Tentang", to: "about" },
  { name: "Unit", to: "units" },
  { name: "Fasilitas", to: "facilities" },
  { name: "Ketersediaan", to: "availability" },
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
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out",
        solidNav ? "bg-white/95 dark:bg-card/95 backdrop-blur-sm shadow-md py-3" : "bg-transparent py-5 text-white"
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

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background dark:bg-card border-b border-border shadow-lg p-4 flex flex-col space-y-2 animate-in slide-in-from-top-5 duration-200">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.name}
              to={item.to}
              smooth duration={500} offset={-80}
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-foreground font-medium py-2.5 px-4 hover:bg-muted rounded-lg transition-colors cursor-pointer text-sm"
            >
              {item.name}
            </Link>
          ))}
          <div className="pt-2 border-t border-border">
            <Button
              className="w-full rounded-xl h-11 font-semibold"
              onClick={() => { setIsMobileMenuOpen(false); onOpenBooking?.(); }}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Pesan Sekarang
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
