import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-scroll";
import {
  MapPin, Phone, Mail, BedDouble, Bath, ChefHat, Wifi, Tv, Wind,
  Star, ArrowRight, Instagram, Users, Shield, Award, Calendar,
  CheckCircle2, Search,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SectionHeading } from "@/components/SectionHeading";
import { BookingModal } from "@/components/BookingModal";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { FAQSection } from "@/components/FAQSection";
import { PricingSection } from "@/components/PricingSection";
import { StickyBookingBar, FloatingBookingButton } from "@/components/StickyBookingBar";
import { UnitDetailModal } from "@/components/UnitDetailModal";
import { Button } from "@/components/ui/button";
import { useUnits, formatIDR } from "@/hooks/use-units";
import { PriceDisplay } from "@/components/PriceDisplay";

// Real photos (served from public/)
const heroImg         = "/belakang/tampak-luar.jpg";
const livingRoomImg   = "/belakang/ruang-keluarga.jpg";
const viewSawahImg    = "/belakang/view-sawah.jpg";
const tengahFrontImg  = "/tengah/tampak-luar.jpg";
const tengahRuangImg  = "/tengah/ruang-keluarga.jpg";

const FACILITIES = [
  { icon: BedDouble, title: "2 Kamar Tidur", description: "Istirahat nyaman dengan 2 kamar tidur queen-size / double bed — ideal untuk keluarga atau grup kecil." },
  { icon: Bath, title: "Kamar Mandi Bersih", description: "Fasilitas modern dengan water heater dan perlengkapan mandi lengkap untuk kesegaran Anda." },
  { icon: ChefHat, title: "Dapur Siap Pakai", description: "Masak hidangan keluarga favorit dengan peralatan dapur lengkap, layaknya di rumah sendiri." },
  { icon: Wifi, title: "Wi-Fi Cepat", description: "Koneksi internet stabil untuk tetap terhubung atau bekerja dari setiap sudut rumah." },
  { icon: Tv, title: "Ruang Keluarga", description: "Area bersantai luas dilengkapi Smart TV untuk momen menonton film bersama keluarga." },
  { icon: Wind, title: "AC di Setiap Kamar", description: "Setiap kamar dilengkapi AC berkualitas tinggi untuk tidur malam yang nyenyak dan sejuk." },
];

const GALLERY_IMAGES = [
  { src: heroImg,         alt: "Tampak Luar Ndalem Belakang — Guest House Solo" },
  { src: tengahFrontImg,  alt: "Tampak Luar Ndalem Tengah — Villa Keluarga Solo" },
  { src: livingRoomImg,   alt: "Ruang Keluarga Ndalem Pleret — Penginapan Private Solo" },
  { src: tengahRuangImg,  alt: "Ruang Keluarga Ndalem Tengah — Sewa Villa Solo" },
  { src: viewSawahImg,    alt: "View Sawah dari Ndalem Pleret Solo" },
];

const UNIT_FEATURES = [
  // Ndalem Belakang
  ["Kapasitas 4–6 Orang", "Ruang Keluarga + Smart TV", "Dapur Lengkap Siap Pakai", "AC di Setiap Kamar · Wi-Fi di Seluruh Area"],
  // Ndalem Tengah
  ["Kapasitas 4–6 Orang", "Ruang Keluarga + Smart TV", "Dapur Lengkap Siap Pakai", "AC di Setiap Kamar · Wi-Fi di Seluruh Area"],
];

const TRUST_STATS = [
  { icon: Users, value: "500+", label: "Tamu Puas" },
  { icon: Star, value: "4.9", label: "Rating Rata-rata" },
  { icon: Award, value: "6+ Tahun", label: "Beroperasi" },
  { icon: Shield, value: "100%", label: "Privasi Terjaga" },
];

// ── WhatsApp Icon ─────────────────────────────────────────────────────────────
function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

// ── Count-up animation component ─────────────────────────────────────────────
function CountUp({ value, delay = 0 }: { value: string; delay?: number }) {
  // Split "500+" → target=500, suffix="+"  |  "4.9" → target=4.9, suffix=""
  // "6+ Tahun" → target=6, suffix="+ Tahun"  |  "100%" → target=100, suffix="%"
  const match = value.match(/^(\d+(?:\.\d+)?)(.*)/);
  const target = match ? parseFloat(match[1]) : 0;
  const suffix = match ? match[2] : value;
  const isFloat = value.includes(".");

  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!inView) return;
    const DURATION = 1600; // ms
    const startDelay = delay * 1000;
    let frameId: number;

    const timer = setTimeout(() => {
      const startTime = performance.now();
      function step(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / DURATION, 1);
        // Ease-out cubic: fast start, smooth landing
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(eased * target);
        if (progress < 1) frameId = requestAnimationFrame(step);
      }
      frameId = requestAnimationFrame(step);
    }, startDelay);

    return () => { clearTimeout(timer); cancelAnimationFrame(frameId); };
  }, [inView, target, delay]);

  const display = isFloat ? count.toFixed(1) : Math.floor(count).toString();

  return (
    <div ref={ref} className="text-2xl font-bold font-display tabular-nums">
      {display}{suffix}
    </div>
  );
}

const WHATSAPP_URL = "https://wa.me/6285121314631";

export default function Home() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [preselectedUnit, setPreselectedUnit] = useState<number | null>(null);
  const [detailSlug, setDetailSlug] = useState<"belakang" | "tengah" | null>(null);
  const { data: units = [] } = useUnits();

  function openBooking(unitId?: number) {
    setPreselectedUnit(unitId ?? null);
    setBookingOpen(true);
  }

  // Map unit id → slug for the detail modal
  function openDetail(unitIndex: number) {
    setDetailSlug(unitIndex === 0 ? "belakang" : "tengah");
  }

  return (
    <div className="min-h-screen font-sans bg-background text-foreground overflow-x-hidden">
      <Navbar onOpenBooking={() => openBooking()} />

      {/* ── HERO ── */}
      <section id="hero" className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* SEO H1 — tersembunyi secara visual, terbaca crawler & screen reader */}
        <h1 className="sr-only">
          Guest House &amp; Penginapan Keluarga Private di Solo — Ndalem Pleret
        </h1>
        <div className="absolute inset-0 z-0">
          <img
            src={heroImg}
            alt="Ndalem Pleret — Guest House &amp; Villa Keluarga Private di Jl. Pleret Dalam, Banjarsari, Solo"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center text-white">
          <motion.span
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-block py-1 px-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-medium tracking-wider mb-6"
          >
            ✦ SELAMAT DATANG DI SOLO
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight text-shadow"
          >
            Kediaman Hangat di<br />
            <span className="text-amber-400 italic drop-shadow-[0_2px_30px_rgba(251,191,36,0.45)]">Jantung Solo</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base md:text-lg text-white/80 max-w-xl mx-auto mb-10 font-light leading-relaxed"
          >
            Guest house &amp; villa keluarga private full-house. Privasi 100%,
            fasilitas lengkap, ±10 menit dari Keraton Solo.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            {/* CTA utama — animasi mencuat keluar dari layar */}
            <motion.div
              animate={{
                scale: [1, 1.07, 1.03, 1.07, 1],
                y: [0, -5, -2, -5, 0],
                boxShadow: [
                  "0 10px 30px rgba(0,0,0,0.35)",
                  "0 22px 55px rgba(201,124,55,0.65)",
                  "0 14px 40px rgba(201,124,55,0.45)",
                  "0 22px 55px rgba(201,124,55,0.65)",
                  "0 10px 30px rgba(0,0,0,0.35)",
                ],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                repeatDelay: 2,
                ease: "easeInOut",
              }}
              style={{ borderRadius: "9999px", display: "inline-flex" }}
            >
              <Button
                size="lg"
                className="rounded-full text-xl font-extrabold px-8 h-14 bg-primary hover:bg-primary/90 text-white border-none transition-colors"
                onClick={() => openBooking()}
              >
                <Calendar className="w-5 h-5 mr-2 shrink-0" />
                Cek Ketersediaan & Pesan
              </Button>
            </motion.div>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full text-base px-8 h-14 bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm transition-all w-full sm:w-auto"
              >
                <WhatsAppIcon className="w-5 h-5 mr-2" />
                Chat WhatsApp
              </Button>
            </a>
          </motion.div>

          {/* Micro trust signals below CTA */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
            className="mt-8 flex flex-wrap justify-center gap-4 text-white/70 text-xs"
          >
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Tidak ada biaya tersembunyi</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Konfirmasi cepat</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Privasi 100%</span>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 animate-bounce">
          <div className="w-5 h-8 border-2 border-white/30 rounded-full flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-white/60 rounded-full" />
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="bg-primary text-white py-6">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {TRUST_STATS.map(({ icon: Icon, value, label }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="flex justify-center mb-2"><Icon className="w-5 h-5 text-white/70" /></div>
                <CountUp value={value} delay={i * 0.12} />
                <div className="text-white/70 text-xs mt-0.5">{label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="py-16 bg-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-secondary/30 -skew-x-12 translate-x-1/4 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-white/60 aspect-[4/5]">
                <img src={livingRoomImg} alt="Ruang Tamu Nyaman" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-5 -right-5 bg-white dark:bg-card p-4 rounded-xl shadow-xl max-w-xs hidden md:block">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-400/20 p-2 rounded-full">
                    <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  </div>
                  <div>
                    <p className="font-bold text-base">Rating 4.9</p>
                    <p className="text-xs text-muted-foreground">500+ tamu puas</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <div>
              <SectionHeading title="Rumah yang Menyambut Anda di Solo" subtitle="TENTANG NDALEM PLERET" centered={false} />
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-4 text-muted-foreground"
              >
                <p className="leading-relaxed">
                  <strong className="text-foreground">Guest house &amp; villa keluarga private</strong> di Banjarsari, Solo — dua unit rumah utuh yang disewakan secara eksklusif. Tidak berbagi dengan tamu lain. Privasi 100%.
                </p>
                <p className="leading-relaxed">
                  Lokasi tenang namun strategis, ±10 menit dari Keraton Solo, Pasar Gede, dan Stasiun Balapan. Ideal untuk liburan keluarga, arisan, reuni, staycation, maupun kunjungan bisnis ke Surakarta.
                </p>
                <ul className="space-y-2 pt-1">
                  {[
                    "2 unit rumah utuh — tidak berbagi dengan tamu lain",
                    "Lokasi ±10 menit dari Keraton Solo & Pasar Gede",
                    "Kapasitas 4–6 orang per unit, fasilitas lengkap",
                    "Lingkungan perumahan bersih, aman, dan tenang",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-foreground font-medium text-sm">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs shrink-0">✓</div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button onClick={() => openBooking()} className="mt-1 rounded-full px-6">
                  Pesan Sekarang
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── UNITS SECTION ── */}
      <section id="units" className="py-24 bg-primary dark:bg-[hsl(25,20%,12%)] text-white relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10 dark:opacity-5"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section heading inline — white text on dark bg */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <p className="text-white/60 uppercase tracking-widest text-xs font-semibold mb-3">2 Unit Tersedia</p>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white">Pilih Unit Anda</h2>
            <div className="w-12 h-0.5 bg-white/40 mx-auto mt-5" />
          </motion.div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {(() => {
              const UNIT_PHOTOS = [heroImg, tengahFrontImg];
              const STATIC_UNITS = [
                { name: "Ndalem Belakang", price: 600000 },
                { name: "Ndalem Tengah", price: 600000 },
              ];

              const cardItems = units.length === 0
                ? STATIC_UNITS.map((u, i) => ({ id: null, index: i, name: u.name, price: u.price }))
                : units.map((u, i) => ({ id: u.id, index: i, name: u.name, price: u.pricePerNight }));

              return cardItems.map((u) => (
                <motion.div key={u.index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: u.index * 0.1 }}
                  className="bg-[hsl(20,45%,10%)] dark:bg-[hsl(25,35%,14%)] rounded-2xl border border-white/10 shadow-xl overflow-hidden group hover:border-white/25 hover:bg-[hsl(20,45%,14%)] dark:hover:bg-[hsl(25,35%,18%)] transition-all cursor-pointer"
                  onClick={() => openDetail(u.index)}
                >
                  {/* Foto compact */}
                  <div className="relative h-32 sm:h-48 overflow-hidden">
                    <img src={UNIT_PHOTOS[u.index]} alt={u.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-2 left-3 text-white font-bold font-display text-sm leading-tight">{u.name}</div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <span className="bg-white/90 text-primary font-semibold text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                        <Search className="w-3.5 h-3.5" /> Lihat Detail &amp; Foto
                      </span>
                    </div>
                  </div>
                  {/* Info compact */}
                  <div className="p-3 sm:p-5">
                    <ul className="space-y-1.5 mb-3">
                      {UNIT_FEATURES[u.index].map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs text-white/80 leading-snug">
                          <CheckCircle2 className="w-3 h-3 text-white/50 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-white/10 pt-2.5">
                      <div className="flex items-end gap-1 mb-2">
                        <PriceDisplay currentPrice={u.price} variant="dark" size="sm" />
                        <span className="text-white/50 text-xs leading-none pb-0.5">/mlm</span>
                      </div>
                      <div className="flex gap-1.5">
                        <Button variant="outline" size="sm"
                          onClick={(e) => { e.stopPropagation(); openDetail(u.index); }}
                          className="flex-1 rounded-lg text-xs h-8 border-white/25 text-white hover:bg-white/10 bg-transparent px-2">
                          Detail
                        </Button>
                        <Button size="sm"
                          onClick={(e) => { e.stopPropagation(); openBooking(u.id ?? undefined); }}
                          className="flex-1 rounded-lg text-xs h-8 bg-white text-primary hover:bg-white/90 font-bold px-2">
                          Pesan
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ));
            })()}
          </div>

        </div>
      </section>

      {/* ── PRICING ── */}
      <PricingSection onOpenBooking={() => openBooking()} />

      {/* ── AVAILABILITY CALENDAR ── */}
      <AvailabilityCalendar onOpenBooking={(id) => openBooking(id)} />

      {/* ── FACILITIES ── */}
      <section id="facilities" className="py-16 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Fasilitas Kami" subtitle="Dirancang untuk Kenyamanan Anda" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {FACILITIES.map((facility, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="bg-white dark:bg-card rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 border border-border/50 group transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary shrink-0">
                  <facility.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm font-display mb-1.5 leading-snug">{facility.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{facility.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LOKASI STRATEGIS ── */}
      <section className="py-14 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Proximity to landmarks — targets "penginapan dekat X solo" queries */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="bg-primary/5 border border-primary/15 rounded-2xl p-5 sm:p-8"
          >
            <h3 className="text-xl font-bold font-display mb-2 text-center">
              Lokasi Strategis di Tengah Kota Solo
            </h3>
            <p className="text-muted-foreground text-sm text-center mb-6 max-w-xl mx-auto leading-relaxed">
              Ndalem Pleret berada di Banjarsari, Surakarta — kawasan perumahan tenang yang mudah dijangkau dari seluruh penjuru Solo. Dekat semua destinasi wisata &amp; kuliner favorit Kota Solo.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { name: "Stasiun Solo Balapan", dist: "±2 km", time: "±7 menit" },
                { name: "Keraton Surakarta", dist: "±4 km", time: "±12 menit" },
                { name: "Pasar Gede Solo", dist: "±4 km", time: "±12 menit" },
                { name: "Kampung Batik Laweyan", dist: "±4 km", time: "±12 menit" },
                { name: "Taman Sriwedari", dist: "±3 km", time: "±10 menit" },
                { name: "Solo Paragon Mall", dist: "±3 km", time: "±10 menit" },
                { name: "Pasar Triwindu (Pasar Antik)", dist: "±2 km", time: "±8 menit" },
                { name: "Bandara Adi Soemarmo", dist: "±10 km", time: "±25 menit" },
              ].map((place, idx) => (
                <motion.div
                  key={place.name}
                  initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.35, delay: idx * 0.05 }}
                  className="flex items-center gap-3 bg-white dark:bg-card rounded-xl px-4 py-3 border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">{place.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{place.dist} · {place.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── GALLERY ── */}
      <section id="gallery" className="py-16 md:py-12 bg-background">
        <div className="max-w-7xl md:max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Lihat ke Dalam" subtitle="Galeri Foto" />
          {/* Gallery grid — foto pertama full-width, sisanya 2×2 */}
          <div className="grid grid-cols-2 gap-3 md:gap-2">
            {GALLERY_IMAGES.map((img, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.08 }}
                className={`relative rounded-2xl overflow-hidden group shadow-md cursor-pointer border border-border/50 ${
                  index === 0 ? "col-span-2 aspect-video" : "aspect-square"
                }`}
              >
                <img src={img.src} alt={img.alt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <span className="text-white font-medium text-xs translate-y-2 group-hover:translate-y-0 transition-transform duration-300 line-clamp-1">
                    {img.alt.split(' — ')[0]}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <TestimonialsSection />

      {/* ── FAQ ── */}
      <FAQSection />

      {/* ── LOCATION & CONTACT ── */}
      <section id="location" className="py-16 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Kunjungi Kami di Banjarsari, Solo"
            subtitle="Lokasi & Kontak — Ndalem Pleret Surakarta"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.6 }}
            >
              <div className="bg-white dark:bg-card rounded-2xl shadow-lg border border-border/50 overflow-hidden">
                {/* Kontak */}
                <div className="p-6 space-y-4">
                  {[
                    { icon: MapPin, title: "Alamat", content: "Jl. Pleret Dalam IV No.6, Banyuanyar, Kec. Banjarsari\nKota Surakarta, Jawa Tengah 57100" },
                    { icon: Phone, title: "WhatsApp & Telepon", content: "+62 851 2131 4631", link: WHATSAPP_URL },
                    { icon: Mail, title: "Email", content: "ndalempleret@gmail.com" },
                  ].map(({ icon: Icon, title, content, link }) => (
                    <div key={title} className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2.5 rounded-lg text-primary mt-0.5 shrink-0"><Icon className="w-4 h-4" /></div>
                      <div>
                        <h4 className="font-semibold text-sm mb-0.5">{title}</h4>
                        <p className="text-muted-foreground text-xs whitespace-pre-line leading-relaxed">{content}</p>
                        {link && <a href={link} className="text-primary hover:underline text-xs font-medium mt-0.5 inline-block">Klik untuk chat →</a>}
                      </div>
                    </div>
                  ))}
                </div>
                {/* CTA strip di bawah */}
                <div className="bg-primary dark:bg-[hsl(28,35%,20%)] text-white p-6">
                  <p className="text-sm opacity-80 mb-4 leading-relaxed">Ketersediaan terbatas — terutama di akhir pekan dan musim liburan.</p>
                  <div className="flex flex-col gap-2.5">
                    <Button onClick={() => openBooking()} className="w-full bg-white text-primary hover:bg-white/90 font-bold h-11 rounded-xl">
                      <Calendar className="w-4 h-4 mr-2" /> Pesan Langsung
                    </Button>
                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10 h-11 rounded-xl flex items-center gap-2">
                        <WhatsAppIcon className="w-4 h-4 shrink-0" />
                        Tanya-tanya dulu - WhatsApp
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="flex flex-col gap-3"
            >
              <div className="h-[450px] rounded-2xl overflow-hidden shadow-lg border border-border/50">
                <iframe
                  src="https://maps.google.com/maps?q=Ndalem+Pleret+Guest+House+%26+Residences,+Jl.+Pleret+Dalam+IV+No.6,+Banyuanyar,+Banjarsari,+Surakarta&output=embed&z=17&hl=id"
                  width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <a
                href="https://maps.app.goo.gl/p7uCeje3zdt9Tnxs9"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-white dark:bg-card border border-border/60 text-primary font-semibold text-sm py-3 rounded-xl shadow-sm hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                Buka di Google Maps
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#1c1510] text-white py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
            <div className="text-center md:text-left">
              <p className="text-2xl font-display font-bold mb-2">Ndalem Pleret</p>
              <p className="text-white/60 text-sm">Guest House &amp; Villa Keluarga Private di Solo</p>
              <p className="text-white/40 text-xs mt-2">Jl. Pleret Dalam IV No.6, Banjarsari, Surakarta 57100</p>
            </div>
            <div className="flex flex-col gap-4 items-center md:items-start">
              <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center md:justify-start">
                {[
                  { name: "Beranda", to: "hero" }, { name: "Tentang", to: "about" },
                  { name: "Unit", to: "units" }, { name: "Fasilitas", to: "facilities" },
                  { name: "Ketersediaan", to: "availability" }, { name: "FAQ", to: "faq" },
                  { name: "Lokasi", to: "location" },
                ].map((item) => (
                  <Link key={item.name} to={item.to} smooth className="text-sm text-white/60 hover:text-white cursor-pointer transition-colors">
                    {item.name}
                  </Link>
                ))}
              </div>
              <div className="flex gap-4 items-center justify-center md:justify-start">
                <a href="http://instagram.com/ndalempleret/" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                  <Instagram className="w-4 h-4" /> @ndalempleret
                </a>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                  <WhatsAppIcon className="w-4 h-4" /> +62 851 2131 4631
                </a>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/10 text-center text-xs text-white/40">
            &copy; {new Date().getFullYear()} Ndalem Pleret Guest House & Residences. Hak Cipta Dilindungi.
          </div>
        </div>
      </footer>

      {/* ── BOOKING MODAL ── */}
      <BookingModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        preselectedUnitId={preselectedUnit}
      />

      {/* ── UNIT DETAIL MODAL ── */}
      <UnitDetailModal
        slug={detailSlug}
        onClose={() => setDetailSlug(null)}
        onBook={(unitId) => openBooking(unitId)}
      />

      {/* ── STICKY CTA ── */}
      <StickyBookingBar onOpenBooking={() => openBooking()} />
      <FloatingBookingButton onOpenBooking={() => openBooking()} />
    </div>
  );
}
