import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, BedDouble, Users, Wifi, Wind, Tv, ChefHat, Bath, Car, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/hooks/use-units";
import { PriceDisplay } from "@/components/PriceDisplay";

interface UnitDetail {
  id: number;
  slug: "belakang" | "tengah";
  name: string;
  tagline: string;
  description: string;
  pricePerNight: number;
  maxGuests: number;
  bedrooms: number;
  photos: { src: string; caption: string }[];
  facilities: { icon: any; label: string }[];
  highlights: string[];
}

const UNIT_DETAILS: UnitDetail[] = [
  {
    id: 1,
    slug: "belakang",
    name: "Ndalem Belakang",
    tagline: "Rumah dengan view sawah yang menenangkan",
    description:
      "Ndalem Belakang adalah rumah 2 lantai dengan nuansa tenang dan pemandangan sawah yang khas. Dilengkapi 2 kamar tidur, ruang keluarga luas, dapur lengkap, dan area parkir. Cocok untuk keluarga atau rombongan yang ingin merasakan ketenangan di pinggir kota Solo.",
    pricePerNight: 600000,
    maxGuests: 6,
    bedrooms: 2,
    photos: [
      { src: "/belakang/tampak-luar.jpg",      caption: "Tampak Luar" },
      { src: "/belakang/tampak-luar-2.jpg",    caption: "Tampak Luar #2" },
      { src: "/belakang/ruang-keluarga.jpg",   caption: "Ruang Keluarga" },
      { src: "/belakang/ruang-keluarga-2.jpg", caption: "Ruang Keluarga #2" },
      { src: "/belakang/kamar-tidur-1.jpg",    caption: "Kamar Tidur 1" },
      { src: "/belakang/kamar-tidur-1-2.jpg",  caption: "Kamar Tidur 1 #2" },
      { src: "/belakang/kamar-tidur-2.jpg",    caption: "Kamar Tidur 2" },
      { src: "/belakang/kamar-tidur-2-2.jpg",  caption: "Kamar Tidur 2 #2" },
      { src: "/belakang/dapur.jpg",            caption: "Dapur & Alat Masak" },
      { src: "/belakang/meja-makan.jpg",       caption: "Meja Makan" },
      { src: "/belakang/kamar-mandi.jpg",      caption: "Kamar Mandi" },
      { src: "/belakang/lantai-2.jpg",         caption: "Lantai 2" },
      { src: "/belakang/lantai-2-2.jpg",       caption: "Lantai 2 #2" },
      { src: "/belakang/view-sawah.jpg",       caption: "View Sawah" },
      { src: "/belakang/jemuran.jpg",          caption: "Tempat Jemuran" },
    ],
    facilities: [
      { icon: BedDouble, label: "2 Kamar Tidur" },
      { icon: Bath,      label: "Kamar Mandi" },
      { icon: ChefHat,   label: "Dapur Lengkap" },
      { icon: Wifi,      label: "Wi-Fi Cepat" },
      { icon: Tv,        label: "Smart TV" },
      { icon: Wind,      label: "AC Setiap Kamar" },
      { icon: Car,       label: "Area Parkir" },
      { icon: Users,     label: "Maks 6 Tamu" },
    ],
    highlights: [
      "View sawah langsung dari rumah",
      "2 lantai dengan ruang yang luas",
      "Dapur lengkap dengan alat masak",
      "Lingkungan tenang & privasi penuh",
    ],
  },
  {
    id: 2,
    slug: "tengah",
    name: "Ndalem Tengah",
    tagline: "Rumah hangat dengan fasilitas modern lengkap",
    description:
      "Ndalem Tengah menghadirkan nuansa rumah yang hangat dengan sentuhan modern. Rumah 2 lantai ini dilengkapi 2 kamar tidur, ruang keluarga nyaman, meja makan, dapur, dan kamar mandi atas-bawah. Ideal untuk keluarga yang ingin merasakan kenyamanan penuh di Solo.",
    pricePerNight: 600000,
    maxGuests: 6,
    bedrooms: 2,
    photos: [
      { src: "/tengah/tampak-luar.jpg",    caption: "Tampak Luar" },
      { src: "/tengah/tampak-luar-2.jpg",  caption: "Tampak Luar #2" },
      { src: "/tengah/ruang-keluarga.jpg", caption: "Ruang Keluarga" },
      { src: "/tengah/tampak-atas.jpg",    caption: "Dapur & Ruang Keluarga" },
      { src: "/tengah/kamar-tidur-1.jpg",  caption: "Kamar Tidur 1" },
      { src: "/tengah/kamar-tidur-1-2.jpg",caption: "Kamar Tidur 1 #2" },
      { src: "/tengah/kamar-tidur-2.jpg",  caption: "Kamar Tidur 2" },
      { src: "/tengah/kamar-tidur-2-2.jpg",caption: "Kamar Tidur 2 #2" },
      { src: "/tengah/meja-makan.jpg",     caption: "Meja Makan" },
      { src: "/tengah/kamar-mandi.jpg",    caption: "Kamar Mandi Atas" },
      { src: "/tengah/toilet-bawah.jpg",   caption: "Toilet Bawah" },
      { src: "/tengah/lantai-2.jpg",       caption: "Lantai 2" },
      { src: "/tengah/jemuran.jpg",        caption: "Ruang Jemuran" },
    ],
    facilities: [
      { icon: BedDouble, label: "2 Kamar Tidur" },
      { icon: Bath,      label: "2 Kamar Mandi" },
      { icon: ChefHat,   label: "Dapur Lengkap" },
      { icon: Wifi,      label: "Wi-Fi Cepat" },
      { icon: Tv,        label: "Smart TV" },
      { icon: Wind,      label: "AC Setiap Kamar" },
      { icon: Car,       label: "Area Parkir" },
      { icon: Users,     label: "Maks 6 Tamu" },
    ],
    highlights: [
      "2 kamar mandi (atas & bawah)",
      "Ruang keluarga luas & nyaman",
      "Meja makan keluarga",
      "Fasilitas modern & lengkap",
    ],
  },
];

export function getUnitDetail(slug: "belakang" | "tengah") {
  return UNIT_DETAILS.find((u) => u.slug === slug)!;
}

interface UnitDetailModalProps {
  slug: "belakang" | "tengah" | null;
  onClose: () => void;
  onBook: (unitId: number) => void;
}

export function UnitDetailModal({ slug, onClose, onBook }: UnitDetailModalProps) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (!slug) return null;
  const unit = getUnitDetail(slug);
  const photos = unit.photos;

  function prev() { setPhotoIdx((i) => (i - 1 + photos.length) % photos.length); }
  function next() { setPhotoIdx((i) => (i + 1) % photos.length); }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="relative z-10 w-full sm:max-w-3xl bg-background rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[95vh] flex flex-col"
        >
          {/* Close — di luar overflow container agar tidak terpotong rounded corner */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-30 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors shadow-lg"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex-1 overflow-y-auto">
            {/* Photo carousel — overflow-hidden di sini saja, bukan di parent modal */}
            <div className="relative h-64 sm:h-80 bg-black rounded-t-3xl sm:rounded-t-2xl overflow-hidden">
              <img
                src={photos[photoIdx].src}
                alt={photos[photoIdx].caption}
                className="w-full h-full object-cover cursor-zoom-in"
                onClick={() => setLightbox(true)}
              />
              {/* Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

              {/* Nav arrows */}
              <button onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Caption + counter */}
              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-4">
                <span className="text-white text-xs bg-black/40 px-2 py-1 rounded-full">
                  {photos[photoIdx].caption}
                </span>
                <span className="text-white/80 text-xs bg-black/40 px-2 py-1 rounded-full">
                  {photoIdx + 1} / {photos.length}
                </span>
              </div>
            </div>

            {/* Thumbnail strip */}
            <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide bg-muted/30">
              {photos.map((p, i) => (
                <button key={i} onClick={() => setPhotoIdx(i)}
                  className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === photoIdx ? "border-primary scale-105" : "border-transparent opacity-60 hover:opacity-100"}`}>
                  <img src={p.src} alt={p.caption} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Info */}
            <div className="p-5 space-y-5">
              {/* Title + price */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold font-display">{unit.name}</h2>
                  <p className="text-muted-foreground text-sm mt-0.5">{unit.tagline}</p>
                </div>
                <div className="text-right shrink-0">
                  <PriceDisplay currentPrice={unit.pricePerNight} size="lg" className="text-right" />
                  <div className="text-xs text-muted-foreground mt-0.5">/malam</div>
                </div>
              </div>

              {/* Description */}
              <p className="text-muted-foreground text-sm leading-relaxed">{unit.description}</p>

              {/* Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {unit.highlights.map((h) => (
                  <div key={h} className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs shrink-0">✓</div>
                    <span className="text-foreground">{h}</span>
                  </div>
                ))}
              </div>

              {/* Facilities */}
              <div>
                <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Fasilitas</h3>
                <div className="grid grid-cols-4 gap-3">
                  {unit.facilities.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-1.5 p-3 bg-muted/40 rounded-xl text-center">
                      <Icon className="w-5 h-5 text-primary" />
                      <span className="text-xs text-muted-foreground leading-tight">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cleaning fee note */}
              <p className="text-xs text-muted-foreground text-center">
                + Deposit jaminan Rp 500.000 · dikembalikan setelah check-out &amp; pengecekan unit
              </p>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="px-5 py-4 border-t border-border/50 bg-white dark:bg-card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Harga per malam</p>
                <p className="font-bold text-lg text-primary leading-tight">
                  {formatIDR(unit.pricePerNight)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground text-right">+ deposit<br/>Rp500.000</p>
            </div>
            <Button
              onClick={() => { onClose(); onBook(unit.id); }}
              className="w-full h-12 rounded-xl font-bold text-base"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Pesan {unit.name}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
          onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2">
            <X className="w-5 h-5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-3">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <img src={photos[photoIdx].src} alt={photos[photoIdx].caption}
            className="max-h-screen max-w-screen object-contain" onClick={(e) => e.stopPropagation()} />
          <button onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-3">
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 text-white/70 text-sm">
            {photos[photoIdx].caption} — {photoIdx + 1}/{photos.length}
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
