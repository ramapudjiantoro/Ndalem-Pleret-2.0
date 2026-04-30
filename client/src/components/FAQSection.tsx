import { useState } from "react";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

const WHATSAPP_URL = "https://wa.me/6285121314631";

interface FAQItem {
  q: string;
  a: string | React.ReactNode;
}

const FAQS: FAQItem[] = [
  // ── Unit & Fasilitas ───────────────────────────────────────────────────────
  {
    q: "Disewakan per kamar atau per rumah?",
    a: "Per rumah/unit secara keseluruhan — bukan per kamar. Anda dan rombongan menikmati seluruh rumah sendiri tanpa berbagi dengan tamu lain. Privasi 100% terjaga.",
  },
  {
    q: "Kapasitas maksimal tiap unit berapa orang?",
    a: "Setiap unit ideal untuk 4–6 orang dewasa. Jika ada anak kecil dalam rombongan, jumlah total bisa lebih fleksibel.",
  },
  {
    q: "Apa perbedaan Ndalem Belakang dan Ndalem Tengah?",
    a: (
      <div className="space-y-3">
        <div>
          <p className="font-semibold text-foreground mb-1">Ndalem Belakang</p>
          <p>Memiliki taman pribadi dan view sawah yang tenang. Cocok untuk tamu yang ingin suasana lebih privat dan premium.</p>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">Ndalem Tengah</p>
          <p>Pilihan value dengan fasilitas yang sama lengkapnya dan area parkir lebih luas. Tetap nyaman untuk keluarga atau rombongan kecil.</p>
        </div>
        <p className="text-muted-foreground/80 text-sm">Keduanya tersedia di harga yang sama — perbedaan utamanya ada pada suasana dan tata letak.</p>
      </div>
    ),
  },
  {
    q: "Fasilitas apa saja yang tersedia di setiap unit?",
    a: (
      <div>
        <p className="mb-3">Setiap unit dilengkapi dengan:</p>
        <ul className="space-y-1.5 text-sm">
          {[
            "AC di seluruh kamar tidur",
            "Wi-Fi di seluruh area rumah",
            "Dapur lengkap — kompor, kulkas, dispenser, peralatan masak & makan",
            "Ruang keluarga dengan Smart TV",
            "Ruang makan",
            "Water heater di kamar mandi",
            "Handuk tersedia",
            "Area parkir kendaraan",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    q: "Apakah tersedia area parkir?",
    a: "Ya, tersedia area parkir untuk kendaraan roda empat dan roda dua. Pastikan koordinasikan jumlah kendaraan jika rombongan besar.",
  },

  // ── Harga & Pembayaran ─────────────────────────────────────────────────────
  {
    q: "Berapa harga menginap di Ndalem Pleret?",
    a: (
      <div className="space-y-2">
        <p>Harga mulai dari <strong className="text-foreground">Rp600.000 / malam</strong>.</p>
        <p>Tersedia harga spesial untuk menginap mingguan dan bulanan — silakan hubungi kami langsung untuk penawaran terbaik.</p>
        <p className="text-sm text-muted-foreground/80">Harga dapat berbeda pada periode high season, hari raya, atau akhir pekan panjang.</p>
      </div>
    ),
  },
  {
    q: "Berapa deposit yang dibutuhkan dan kapan dikembalikan?",
    a: "Deposit jaminan sebesar Rp500.000 dibayarkan bersama pelunasan sebelum check-in. Deposit dikembalikan penuh setelah check-out dan pengecekan kondisi unit — selama tidak ada kerusakan atau kehilangan.",
  },
  {
    q: "Bagaimana cara memesan dan melakukan pembayaran?",
    a: (
      <div className="space-y-2">
        <p>Pemesanan bisa langsung dilakukan melalui website ini — pilih unit, isi data tamu, dan submit. Setelah booking diterima, kami akan menghubungi Anda melalui WhatsApp untuk:</p>
        <ul className="space-y-1 text-sm ml-4 list-disc">
          <li>Konfirmasi ketersediaan</li>
          <li>Instruksi pembayaran (transfer bank / QRIS)</li>
          <li>Detail check-in dan koordinasi kedatangan</li>
        </ul>
        <p className="text-sm text-muted-foreground/80 mt-2">Booking baru dikonfirmasi setelah pembayaran diterima.</p>
      </div>
    ),
  },
  {
    q: "Apakah bisa sewa mingguan atau bulanan?",
    a: "Bisa. Kami menyediakan harga khusus untuk sewa mingguan dan bulanan. Silakan hubungi kami melalui WhatsApp untuk mendapatkan penawaran sesuai durasi menginap Anda.",
  },

  // ── Check-in & Kebijakan ───────────────────────────────────────────────────
  {
    q: "Jam check-in dan check-out?",
    a: (
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary font-semibold px-3 py-1 rounded-lg text-sm min-w-[110px] text-center">Check-in</span>
          <span>Mulai pukul 14.00 WIB</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-muted text-muted-foreground font-semibold px-3 py-1 rounded-lg text-sm min-w-[110px] text-center">Check-out</span>
          <span>Maksimal pukul 12.00 WIB</span>
        </div>
      </div>
    ),
  },
  {
    q: "Apakah bisa early check-in atau late check-out?",
    a: "Bisa, menyesuaikan ketersediaan jadwal unit pada hari tersebut. Silakan hubungi kami terlebih dahulu untuk konfirmasi agar bisa kami siapkan.",
  },
  {
    q: "Bagaimana jika saya perlu membatalkan atau reschedule?",
    a: "Segera hubungi kami melalui WhatsApp di +62 851 2131 4631 sebelum tanggal check-in. Kami akan berusaha membantu penyesuaian tanggal atau penyelesaian terbaik sesuai kondisi dan ketersediaan unit.",
  },
  {
    q: "Apakah ada layanan housekeeping selama menginap?",
    a: "Untuk menginap pendek (1–3 malam), pembersihan dilakukan saat sebelum check-in dan setelah check-out. Untuk menginap lebih panjang, housekeeping berkala bisa diatur sesuai kebutuhan — silakan diskusikan saat booking.",
  },
  {
    q: "Apakah tamu/kerabat dari luar boleh berkunjung?",
    a: "Boleh. Kami hanya memohon untuk menginformasikan terlebih dahulu agar pengelola dapat mengatur akses dengan baik dan kenyamanan semua pihak tetap terjaga.",
  },
  {
    q: "Apakah boleh membawa hewan peliharaan?",
    a: "Mohon konfirmasi terlebih dahulu kepada kami melalui WhatsApp sebelum membawa hewan peliharaan. Keputusan menyesuaikan kondisi unit dan jenis hewan.",
  },

  // ── Lokasi & Lainnya ──────────────────────────────────────────────────────
  {
    q: "Apakah lokasi dekat dengan Graha Saba Buana?",
    a: "Ya, hanya sekitar 5 menit dari Graha Saba Buana. Ndalem Pleret sering menjadi pilihan utama tamu yang menghadiri acara pernikahan atau event di area tersebut karena kemudahan aksesnya.",
  },
  {
    q: "Apa saja yang ada di sekitar Ndalem Pleret?",
    a: "Lokasi kami strategis di tengah kota Solo — dekat dengan Pasar Gede (±10 menit), Keraton Kasunanan Solo (±12 menit), Galabo (pusat kuliner malam khas Solo), minimarket 24 jam, dan berbagai pilihan restoran serta warung makan di sekitar area.",
  },
  {
    q: "Kenapa memilih Ndalem Pleret dibanding hotel?",
    a: (
      <div className="space-y-3">
        <p>Dengan harga yang dimulai dari Rp600.000/malam, Anda mendapatkan <strong className="text-foreground">satu rumah penuh</strong> — bukan satu kamar. Ini berarti:</p>
        <ul className="space-y-1.5 text-sm">
          {[
            "Privasi total — tidak ada tamu lain di dalam rumah yang sama",
            "Lebih nyaman untuk keluarga besar, rombongan, atau arisan",
            "Dapur lengkap untuk memasak sendiri, hemat makan sehari-hari",
            "Ruang keluarga luas untuk ngobrol dan bersantai bersama",
            "Suasana homey yang hangat — bukan suasana hotel yang formal",
            "Lokasi strategis dekat venue acara dan pusat kota Solo",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-primary mt-0.5 shrink-0">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
];

function FAQItem({ item, isOpen, onToggle }: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`border-b border-border/50 last:border-0 transition-colors ${isOpen ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-secondary/50 dark:hover:bg-secondary/20"} rounded-xl px-5`}>
      <button
        className="w-full flex items-center justify-between py-5 text-left gap-4 group"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className={`font-semibold text-sm sm:text-base leading-snug transition-colors ${isOpen ? "text-primary" : "text-foreground group-hover:text-primary"}`}>
          {item.q}
        </span>
        <ChevronDown
          className={`w-5 h-5 shrink-0 transition-all duration-300 ${isOpen ? "rotate-180 text-primary" : "text-muted-foreground group-hover:text-primary"}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-5 text-sm text-muted-foreground leading-relaxed">
              {item.a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  function toggle(i: number) {
    setOpenIndex(openIndex === i ? null : i);
  }

  return (
    <section id="faq" className="py-24 bg-secondary/30 dark:bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading title="Pertanyaan yang Sering Ditanyakan" subtitle="FAQ" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">

          {/* ── Accordion ── */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-white dark:bg-card rounded-2xl shadow-sm border border-border/50 divide-y divide-border/50 overflow-hidden"
            >
              {FAQS.map((item, i) => (
                <FAQItem
                  key={i}
                  item={item}
                  isOpen={openIndex === i}
                  onToggle={() => toggle(i)}
                />
              ))}
            </motion.div>
          </div>

          {/* ── Sidebar CTA ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:sticky lg:top-24 space-y-4"
          >
            {/* Quick facts */}
            <div className="bg-primary dark:bg-[hsl(28,35%,20%)] text-white rounded-2xl p-6 shadow-sm border border-transparent dark:border-white/10">
              <p className="text-xs uppercase tracking-widest text-white/60 mb-3 font-semibold">Ringkasan Cepat</p>
              <ul className="space-y-2.5 text-sm">
                {[
                  "✓  Sewa per rumah — privasi 100%",
                  "✓  4–6 orang per unit",
                  "✓  Check-in 14.00 · Check-out 12.00",
                  "✓  Mulai Rp600.000 / malam",
                  "✓  Deposit Rp500.000 (refundable)",
                  "✓  Tersedia sewa mingguan & bulanan",
                ].map((item) => (
                  <li key={item} className="text-white/85 leading-snug">{item}</li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
