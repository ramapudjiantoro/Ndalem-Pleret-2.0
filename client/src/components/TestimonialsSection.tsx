import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

// ── Review asli dari Google Maps ──────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: "mohamad freddy.y",
    badge: "Local Guide · 59 ulasan",
    rating: 5,
    text: "Menyenangkan menginap di Ndalem Pleret. Fasilitas lengkap: dispenser, handuk, air panas, dapur plus peralatan masak dan makan, WiFi, TV, AC. Penjaga dan owner sangat ramah dan helpfull. Lokasi dekat kuliner dan Stadion Manahan. Kebersihan selalu terjaga. Terimakasih!",
    date: "Januari 2025",
    highlight: "⭐ Local Guide",
  },
  {
    name: "Vera Elviana",
    badge: "6 ulasan · 2 foto",
    rating: 5,
    text: "MasyaAllah seneng bisa singgah di Ndalem Pleret! Guest house-nya bersih, fasilitas lengkap, disediakan handuk juga, owner fast respon, bapak penjaga sangat ramah. Yang paling wow ternyata dekat rumah Pak Jokowi! Rekomended banget buat yang cari GH / homestay area Solo.",
    date: "Juni 2024",
    highlight: "Menginap Keluarga",
  },
  {
    name: "Gandha Asmara",
    badge: "Local Guide · 306 ulasan",
    rating: 5,
    text: "Ndalem Pleret adalah guest house yang terletak sangat strategis di tengah kota Solo, tidak jauh dari pintu tol. Fasilitas lengkap: bantal, guling, selimut, kamar AC, TV, internet, 2 kamar mandi, 2 kamar tidur, peralatan makan & masak, pemanas air, kulkas, WC duduk. Selamat berlibur bersama keluarga!",
    date: "2022",
    highlight: "⭐ Local Guide · 306 Ulasan",
  },
  {
    name: "AH!",
    badge: "8 ulasan · 12 foto",
    rating: 5,
    text: "Check in sekeluarga 6 orang. Fasilitas oke banget — rumah 2 lantai, 2 kamar mandi, 2 kamar tidur + 1 sofa bed, ruang tamu & TV, dapur kompor, jemuran. Daerah sunyi. Overall nyaman untuk tinggal dan harganya masih masuk akal. Semoga bisa menginap lagi!",
    date: "2023",
    highlight: "Keluarga 6 Orang",
  },
  {
    name: "delfi hotmaida",
    badge: "8 ulasan · 14 foto",
    rating: 5,
    text: "Dengan harga yang lumayan murah tapi fasilitas baik dan lengkap — ada peralatan masak, kompor, air mineral, dan kulkas. Sangat worth it untuk menginap di Solo bersama keluarga.",
    date: "April 2025",
    highlight: "Tamu Terbaru",
  },
  {
    name: "Max Hendrik",
    badge: "Local Guide · 11 ulasan",
    rating: 5,
    text: "Tempat nyaman dan bersih. Fasilitas oke — ada kulkas dan TV. Kamar mandi bagus dilengkapi shower. Sangat recommended untuk menginap di Solo.",
    date: "April 2025",
    highlight: "⭐ Local Guide · Terbaru",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 mt-1.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

// Google logo SVG inline
function GoogleLogo() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Yang Mereka Katakan"
          subtitle="Ulasan Tamu — Google Maps"
        />

        {/* Aggregate rating */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12 bg-white dark:bg-card rounded-2xl p-6 border border-border/50 shadow-sm max-w-md mx-auto"
        >
          <div className="text-center">
            <div className="text-5xl font-bold font-display text-primary leading-none">4.9</div>
            {/* gap antara angka dan bintang diperbesar */}
            <div className="flex justify-center mt-2">
              <StarRating rating={5} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Dari 21+ ulasan Google Maps</p>
          </div>
          <div className="w-px h-16 bg-border hidden sm:block" />
          <div className="text-center sm:text-left space-y-1">
            {[
              { cat: "Kebersihan", score: "4.9", pct: "98%" },
              { cat: "Lokasi",     score: "4.8", pct: "96%" },
              { cat: "Komunikasi", score: "5.0", pct: "100%" },
              { cat: "Fasilitas",  score: "4.9", pct: "98%" },
            ].map(({ cat, score, pct }) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-24">{cat}</span>
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: pct }} />
                </div>
                <span className="text-xs font-semibold">{score}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Two-column staggered overlap — kanan offset ke bawah, kartu bertumpuk */}
        <div className="flex gap-3 sm:gap-4 items-start">
          {[0, 1].map((col) => {
            const colItems = TESTIMONIALS.filter((_, i) => i % 2 === col);
            return (
              <div key={col} className={`flex-1 flex flex-col ${col === 1 ? "mt-10" : ""}`}>
                {colItems.map((t, colIdx) => {
                  const isLast = colIdx === colItems.length - 1;
                  return (
                    <motion.div
                      key={colIdx}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: colIdx * 0.1 + col * 0.06 }}
                      style={{
                        zIndex: (colIdx + 1) * 10,
                        marginBottom: isLast ? 0 : -22,
                      }}
                      className="relative bg-white dark:bg-card rounded-2xl p-4 pb-10 border border-border/50 shadow-md"
                    >
                      <Quote className="absolute top-3 right-3 w-5 h-5 text-primary/10" />
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {t.name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs sm:text-sm leading-tight truncate">{t.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t.date}</p>
                        </div>
                        <div className="shrink-0 bg-secondary/60 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                          <GoogleLogo />
                          <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">Maps</span>
                        </div>
                      </div>
                      {/* Stars */}
                      <div className="flex gap-0.5 mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      {/* Text */}
                      <p className="text-[11px] sm:text-xs leading-relaxed text-muted-foreground line-clamp-4">"{t.text}"</p>
                      {/* Highlight */}
                      <div className="mt-2 inline-block bg-secondary text-[10px] sm:text-xs text-foreground/60 px-2 py-0.5 rounded-full font-medium">
                        {t.highlight}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Link ke semua ulasan Google */}
        <div className="text-center mt-8">
          <a
            href="https://maps.app.goo.gl/p7uCeje3zdt9Tnxs9"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <GoogleLogo />
            Lihat semua ulasan di Google Maps →
          </a>
        </div>
      </div>
    </section>
  );
}
