import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

const TESTIMONIALS = [
  {
    name: "Budi Santoso",
    origin: "Jakarta",
    rating: 5,
    text: "Luar biasa! Rumahnya bersih, nyaman, dan lokasinya strategis. Anak-anak senang sekali. Kami sekeluarga sudah menginap dua kali dan pasti akan kembali. Terima kasih Ndalem Pleret!",
    date: "Maret 2025",
    highlight: "Keluarga dengan 2 anak",
  },
  {
    name: "Sari Dewi",
    origin: "Bandung",
    rating: 5,
    text: "Persis seperti di foto, bahkan lebih bagus! Dapur lengkap banget, kami bisa masak sendiri. Harga sangat terjangkau untuk fasilitas yang ditawarkan. Recommended banget!",
    date: "Februari 2025",
    highlight: "Arisan keluarga besar",
  },
  {
    name: "Hendra & Keluarga",
    origin: "Semarang",
    rating: 5,
    text: "Tempat yang sempurna untuk reuni keluarga. Privasi terjaga karena satu rumah penuh untuk kami sendiri. Parkiran luas, lingkungan aman. Pemiliknya juga ramah dan responsif.",
    date: "Januari 2025",
    highlight: "Reuni keluarga besar",
  },
  {
    name: "Mega Putri",
    origin: "Surabaya",
    rating: 5,
    text: "Dekat ke Pasar Gede dan Keraton, cocok banget buat wisata kuliner Solo. Rumahnya nyaman, AC dingin, kasurnya empuk. Puas sekali, pasti balik lagi!",
    date: "Desember 2024",
    highlight: "Wisata kuliner Solo",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Kata Tamu Kami"
          subtitle="Ulasan & Testimoni"
        />

        {/* Aggregate rating */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12 bg-white dark:bg-card rounded-2xl p-6 border border-border/50 shadow-sm max-w-md mx-auto"
        >
          <div className="text-center">
            <div className="text-5xl font-bold font-display text-primary">4.9</div>
            <StarRating rating={5} />
            <p className="text-xs text-muted-foreground mt-1">Dari {TESTIMONIALS.length}+ ulasan</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white dark:bg-card rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-shadow relative"
            >
              <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10" />
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {t.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.origin} · {t.date}</p>
                </div>
              </div>
              <StarRating rating={t.rating} />
              <p className="mt-3 text-muted-foreground text-sm leading-relaxed">"{t.text}"</p>
              <div className="mt-3 inline-block bg-secondary text-xs text-foreground/70 px-2.5 py-1 rounded-full font-medium">
                {t.highlight}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
