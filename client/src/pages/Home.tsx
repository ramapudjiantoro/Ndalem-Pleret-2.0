import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-scroll";
import {
  MapPin, Phone, Mail, BedDouble, Bath, ChefHat, Wifi, Tv, Wind,
  Star, ArrowRight, Instagram, Users, Shield, Award, Calendar,
  CheckCircle2, Search,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SectionHeading } from "@/components/SectionHeading";
import { FacilityCard } from "@/components/FacilityCard";
import { BookingModal } from "@/components/BookingModal";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { StickyBookingBar, FloatingBookingButton } from "@/components/StickyBookingBar";
import { UnitDetailModal } from "@/components/UnitDetailModal";
import { Button } from "@/components/ui/button";
import { useUnits, formatIDR } from "@/hooks/use-units";

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
  { src: heroImg,         alt: "Tampak Luar Ndalem Belakang" },
  { src: tengahFrontImg,  alt: "Tampak Luar Ndalem Tengah" },
  { src: livingRoomImg,   alt: "Ruang Keluarga" },
  { src: tengahRuangImg,  alt: "Ruang Keluarga Ndalem Tengah" },
  { src: viewSawahImg,    alt: "View Sawah" },
];

const UNIT_FEATURES = [
  // Ndalem Belakang
  ["Kapasitas 4–6 Orang", "Ruang Keluarga Luas + Smart TV", "Dapur Lengkap Siap Pakai", "Taman Pribadi & Parkir", "AC + Wi-Fi di Seluruh Area"],
  // Ndalem Tengah
  ["Kapasitas 4–6 Orang", "Ruang Keluarga + Smart TV", "Dapur Lengkap Siap Pakai", "Area Parkir Luas & Aman", "AC + Wi-Fi di Seluruh Area"],
];

const TRUST_STATS = [
  { icon: Users, value: "500+", label: "Tamu Puas" },
  { icon: Star, value: "4.9", label: "Rating Rata-rata" },
  { icon: Award, value: "6+ Tahun", label: "Beroperasi" },
  { icon: Shield, value: "100%", label: "Privasi Terjaga" },
];

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
        <div className="absolute inset-0 z-0">
          <img src={heroImg} alt="Eksterior Ndalem Pleret" className="w-full h-full object-cover" />
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
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight text-shadow"
          >
            Kediaman Hangat di<br />Jantung Solo
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-10 font-light"
          >
            Satu rumah utuh untuk keluarga Anda. Privasi penuh, fasilitas lengkap, lokasi strategis dekat pusat kota Solo.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              className="rounded-full text-base px-8 h-14 bg-primary hover:bg-primary/90 text-white border-none shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
              onClick={() => openBooking()}
            >
              <Calendar className="w-5 h-5 mr-2" />
              Cek Ketersediaan & Pesan
            </Button>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full text-base px-8 h-14 bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm transition-all w-full sm:w-auto"
              >
                <Phone className="w-5 h-5 mr-2" />
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
                <div className="text-2xl font-bold font-display">{value}</div>
                <div className="text-white/70 text-xs">{label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="py-24 bg-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-secondary/30 -skew-x-12 translate-x-1/4 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
                <img src={livingRoomImg} alt="Ruang Tamu Nyaman" className="w-full h-auto object-cover" />
              </div>
              <div className="absolute -bottom-8 -right-8 bg-white dark:bg-card p-6 rounded-xl shadow-xl max-w-xs hidden md:block">
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-yellow-400/20 p-2 rounded-full">
                    <Star className="w-6 h-6 text-yellow-500 fill-current" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Rating 4.9</p>
                    <p className="text-sm text-muted-foreground">500+ tamu puas</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <div>
              <SectionHeading title="Rumah yang Menyambut Anda di Solo" subtitle="TENTANG NDALEM PLERET" centered={false} />
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-5 text-muted-foreground"
              >
                <p className="leading-relaxed">
                  Ndalem Pleret bukan sekadar akomodasi — melainkan rumah yang siap menyambut kepulangan Anda di Surakarta. Kami menyediakan <strong className="text-foreground">dua unit rumah utuh</strong> yang dirancang khusus untuk memberikan kehangatan dan privasi maksimal bagi keluarga atau rombongan Anda.
                </p>
                <p className="leading-relaxed">
                  Terletak di lokasi tenang namun strategis, homestay kami menjadi tempat perlindungan pribadi yang sempurna setelah seharian menjelajahi kekayaan budaya dan kuliner kota Solo.
                </p>
                <ul className="space-y-2.5">
                  {[
                    "Dua unit rumah utuh — privasi penuh untuk grup Anda",
                    "Lokasi strategis, dekat Pasar Gede & Keraton Solo",
                    "Ideal untuk keluarga besar, arisan, atau reuni",
                    "Lingkungan bersih, aman, dan tenang 24 jam",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-foreground font-medium text-sm">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs shrink-0">✓</div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button onClick={() => openBooking()} className="mt-2 rounded-full px-6">
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
            className="text-center mb-14"
          >
            <p className="text-white/60 uppercase tracking-widest text-xs font-semibold mb-3">2 Unit Tersedia</p>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white">Pilih Unit Anda</h2>
            <div className="w-12 h-0.5 bg-white/40 mx-auto mt-5" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                  className="bg-white/10 dark:bg-[hsl(28,35%,20%)] backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/15 shadow-2xl overflow-hidden group hover:border-white/40 hover:bg-white/15 transition-all cursor-pointer"
                  onClick={() => openDetail(u.index)}
                >
                  <div className="relative h-56 overflow-hidden">
                    <img src={UNIT_PHOTOS[u.index]} alt={u.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 text-white font-bold font-display text-lg">{u.name}</div>
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <span className="bg-white/90 text-primary font-semibold text-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                        <Search className="w-4 h-4" /> Lihat Detail & Foto
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <ul className="space-y-2 mb-6">
                      {UNIT_FEATURES[u.index].map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-white/85">
                          <div className="bg-white/20 p-0.5 rounded-full shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-white/15">
                      <div>
                        <span className="text-2xl font-bold text-white font-display">{formatIDR(u.price)}</span>
                        <span className="text-white/60 text-sm">/malam</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={(e) => { e.stopPropagation(); openDetail(u.index); }}
                          className="flex-1 sm:flex-initial rounded-xl text-sm px-3 border-white/30 text-white hover:bg-white/10 bg-transparent">
                          Lihat Detail
                        </Button>
                        <Button onClick={(e) => { e.stopPropagation(); openBooking(u.id ?? undefined); }}
                          className="flex-1 sm:flex-initial rounded-xl text-sm px-3 bg-white text-primary hover:bg-white/90 font-bold">
                          Pesan
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ));
            })()}
          </div>

          {/* Deposit info */}
          <p className="text-center text-white/55 text-sm mt-8">
            + Deposit jaminan Rp 500.000 (dikembalikan setelah check-out &amp; pengecekan unit)
          </p>
        </div>
      </section>

      {/* ── AVAILABILITY CALENDAR ── */}
      <AvailabilityCalendar onOpenBooking={(id) => openBooking(id)} />

      {/* ── FACILITIES ── */}
      <section id="facilities" className="py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Fasilitas Kami" subtitle="Dirancang untuk Kenyamanan Anda" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FACILITIES.map((facility, index) => (
              <FacilityCard key={index} {...facility} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* ── GALLERY ── */}
      <section id="gallery" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Galeri Foto" subtitle="Lihat ke Dalam" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {GALLERY_IMAGES.map((img, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.08 }}
                className={`relative rounded-2xl overflow-hidden group shadow-md cursor-pointer border border-border/50 ${index === 0 ? "col-span-2 row-span-2 aspect-square sm:aspect-auto" : "aspect-square"}`}
              >
                <img src={img.src} alt={img.alt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <span className="text-white font-medium text-sm translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    {img.alt}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <TestimonialsSection />

      {/* ── LOCATION & CONTACT ── */}
      <section id="location" className="py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Kunjungi Kami" subtitle="Lokasi & Kontak" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div className="bg-white dark:bg-card p-8 rounded-2xl shadow-lg border border-border/50">
                <h3 className="text-2xl font-bold font-display mb-6">Informasi Kontak</h3>
                <div className="space-y-6">
                  {[
                    { icon: MapPin, title: "Alamat", content: "Jl. Pleret Dalam IV No.6, Banyuanyar, Kec. Banjarsari\nKota Surakarta, Jawa Tengah 57100\nIndonesia" },
                    { icon: Phone, title: "WhatsApp & Telepon", content: "+62 851 2131 4631", link: WHATSAPP_URL },
                    { icon: Mail, title: "Email", content: "ndalempleret@gmail.com" },
                  ].map(({ icon: Icon, title, content, link }) => (
                    <div key={title} className="flex items-start gap-4">
                      <div className="bg-primary/10 p-3 rounded-lg text-primary mt-1"><Icon className="w-5 h-5" /></div>
                      <div>
                        <h4 className="font-semibold mb-1">{title}</h4>
                        <p className="text-muted-foreground text-sm whitespace-pre-line">{content}</p>
                        {link && <a href={link} className="text-primary hover:underline text-xs font-medium mt-1 inline-block">Klik untuk chat →</a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-primary dark:bg-[hsl(28,35%,20%)] text-white p-8 rounded-2xl shadow-xl border border-transparent dark:border-white/15">
                <h3 className="text-xl font-bold mb-3">Siap Menginap Bersama Kami?</h3>
                <p className="mb-6 opacity-90 leading-relaxed text-sm">Amankan tanggal Anda sekarang. Ketersediaan terbatas — terutama di akhir pekan dan musim liburan.</p>
                <div className="flex flex-col gap-3">
                  <Button onClick={() => openBooking()} className="w-full bg-white text-primary hover:bg-white/90 font-bold h-12 rounded-xl">
                    <Calendar className="w-4 h-4 mr-2" /> Pesan Langsung
                  </Button>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10 h-12 rounded-xl">
                      Tanya-tanya dulu - WhatsApp
                    </Button>
                  </a>
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
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <h2 className="text-2xl font-display font-bold mb-2">Ndalem Pleret</h2>
              <p className="text-white/60 text-sm">Homestay Jawa Otentik di Solo</p>
              <p className="text-white/40 text-xs mt-2">Jl. Pleret Dalam IV No.6, Surakarta</p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-6">
                {[
                  { name: "Beranda", to: "hero" }, { name: "Tentang", to: "about" },
                  { name: "Unit", to: "units" }, { name: "Fasilitas", to: "facilities" },
                  { name: "Ketersediaan", to: "availability" }, { name: "Lokasi", to: "location" },
                ].map((item) => (
                  <Link key={item.name} to={item.to} smooth className="text-sm text-white/60 hover:text-white cursor-pointer transition-colors">
                    {item.name}
                  </Link>
                ))}
              </div>
              <div className="flex gap-4 items-center">
                <a href="http://instagram.com/ndalempleret/" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                  <Instagram className="w-4 h-4" /> @ndalempleret
                </a>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                  <Phone className="w-4 h-4" /> +62 851 2131 4631
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
