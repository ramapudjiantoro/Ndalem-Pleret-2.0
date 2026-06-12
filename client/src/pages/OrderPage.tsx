import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  CheckCircle2, Clock, XCircle, BedDouble, Calendar,
  User, Phone, Mail, MessageCircle, Home, Copy, Check,
  RefreshCw, MapPin, Banknote, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/hooks/use-units";
import { computePricing } from "@shared/pricing";

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrderDetail {
  id: number;
  bookingRef: string;
  unitName: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  pricePerNight?: number;
  guestCount: number;
  status: "pending" | "confirmed" | "cancelled";
  paymentStatus: "pending" | "paid";
  notes?: string;
  createdAt: string;
}

const WHATSAPP_NUMBER = "6285121314631";

function formatDate(d: string) {
  return format(new Date(d), "EEEE, dd MMMM yyyy", { locale: idLocale });
}

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: OrderDetail["status"] }) {
  const map = {
    pending:   { icon: Clock,        label: "Menunggu Konfirmasi", cls: "bg-amber-100 text-amber-800 border-amber-200" },
    confirmed: { icon: CheckCircle2, label: "Dikonfirmasi",        cls: "bg-green-100 text-green-800 border-green-200" },
    cancelled: { icon: XCircle,      label: "Dibatalkan",          cls: "bg-red-100 text-red-800 border-red-200" },
  };
  const { icon: Icon, label, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${cls}`}>
      <Icon className="w-4 h-4" /> {label}
    </span>
  );
}

function PaymentBadge({ status }: { status: OrderDetail["paymentStatus"] }) {
  if (status === "paid") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold bg-green-100 text-green-800 border-green-200">
      <Banknote className="w-4 h-4" /> Lunas
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold bg-orange-100 text-orange-800 border-orange-200">
      <Banknote className="w-4 h-4" /> Belum Dibayar
    </span>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function OrderPage() {
  const params = useParams<{ ref: string }>();
  const [, navigate] = useLocation();
  const ref = params.ref?.toUpperCase();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchOrder(silent = false) {
    if (!ref) { setError("Kode pemesanan tidak valid."); setLoading(false); return; }
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${ref}`);
      if (!res.ok) {
        setError("Pesanan tidak ditemukan. Pastikan kode pemesanan kamu benar.");
        setOrder(null);
        return;
      }
      const data = await res.json();
      setOrder(data);
    } catch {
      setError("Gagal memuat data. Periksa koneksi internet kamu.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchOrder(); }, [ref]);

  function copyRef() {
    if (!ref) return;
    navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function buildWhatsApp() {
    if (!order) return "#";
    const msg = encodeURIComponent(
      `Halo Ndalem Pleret! Saya ingin menanyakan status pesanan saya.\n\n` +
      `Kode Pesanan: *${order.bookingRef}*\n` +
      `Nama: ${order.guestName}\n` +
      `Unit: ${order.unitName}\n` +
      `Check-in: ${formatDate(order.checkIn)}\n` +
      `Check-out: ${formatDate(order.checkOut)}\n\n` +
      `Terima kasih!`
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
  }

  // Harga: SATU sumber kebenaran dari shared/pricing (sama dgn date-picker & server).
  const ppn = order ? (order.pricePerNight ?? (order.nights > 0 ? Math.round(order.totalPrice / order.nights) : 0)) : 0;
  const pricing = order ? computePricing(ppn, order.nights) : null;
  const discountPct = pricing?.discountPct ?? 0;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="theme-light min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">Memuat data pesanan...</p>
      </div>
    </div>
  );

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !order) return (
    <div className="theme-light min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground mb-2">Pesanan Tidak Ditemukan</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
        <div className="space-y-3">
          <Button onClick={() => fetchOrder()} className="w-full rounded-xl h-12">
            <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
          </Button>
          <Button variant="outline" onClick={() => navigate("/")} className="w-full rounded-xl h-12">
            <Home className="w-4 h-4 mr-2" /> Kembali ke Beranda
          </Button>
        </div>
      </div>
    </div>
  );

  // ── Success: Show Order ────────────────────────────────────────────────────
  const orderUrl = `${window.location.origin}/order/${order.bookingRef}`;

  return (
    <div className="theme-light min-h-screen bg-[#faf9f7]">

      {/* Top bar */}
      <div className="bg-[#2d1a0e] text-white px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm">
          <Home className="w-4 h-4" /> Ndalem Pleret
        </button>
        <button
          onClick={() => fetchOrder(true)}
          className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="text-center">
          {order.status === "confirmed" ? (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
          ) : order.status === "cancelled" ? (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-9 h-9 text-red-500" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-9 h-9 text-amber-600" />
            </div>
          )}
          <h1 className="text-2xl font-bold font-display text-foreground">Detail Pesanan</h1>
          <p className="text-muted-foreground text-sm mt-1">Ndalem Pleret Guest House · Solo</p>
        </div>

        {/* Booking Ref Card */}
        <div className="bg-white border border-border rounded-2xl p-5 text-center shadow-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Kode Pemesanan</p>
          <p className="text-3xl font-bold font-mono text-[#2d1a0e] tracking-wider">{order.bookingRef}</p>
          <button
            onClick={copyRef}
            className="mt-2 flex items-center gap-1.5 mx-auto text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Tersalin!" : "Salin kode"}
          </button>
          <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.paymentStatus} />
          </div>
        </div>

        {/* Info pesanan */}
        <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border/50 bg-[#2d1a0e]/5">
            <h2 className="font-semibold text-foreground text-sm">Rincian Pesanan</h2>
          </div>
          <div className="p-5 space-y-4 text-sm">

            {/* Unit */}
            <div className="flex items-start gap-3">
              <BedDouble className="w-4 h-4 text-[#2d1a0e] mt-0.5 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Unit</p>
                <p className="font-semibold text-foreground">{order.unitName}</p>
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-[#2d1a0e] mt-0.5 shrink-0" />
              <div className="w-full">
                <p className="text-muted-foreground text-xs mb-1">Tanggal Menginap</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-secondary/40 rounded-lg p-2.5">
                    <p className="text-xs text-muted-foreground">Check-in</p>
                    <p className="font-semibold text-foreground">{formatDate(order.checkIn)}</p>
                  </div>
                  <div className="bg-secondary/40 rounded-lg p-2.5">
                    <p className="text-xs text-muted-foreground">Check-out</p>
                    <p className="font-semibold text-foreground">{formatDate(order.checkOut)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{order.nights} malam · {order.guestCount} tamu</p>
              </div>
            </div>

            {/* Guest info */}
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-[#2d1a0e] mt-0.5 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Pemesan</p>
                <p className="font-semibold text-foreground">{order.guestName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-[#2d1a0e] shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">WhatsApp / HP</p>
                <p className="font-medium text-foreground">{order.guestPhone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-[#2d1a0e] shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium text-foreground">{order.guestEmail}</p>
              </div>
            </div>

            {order.notes && (
              <div className="bg-secondary/40 rounded-lg p-3 text-xs text-muted-foreground italic">
                "{order.notes}"
              </div>
            )}
          </div>
        </div>

        {/* Rincian harga */}
        <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border/50 bg-[#2d1a0e]/5">
            <h2 className="font-semibold text-foreground text-sm">Rincian Pembayaran</h2>
          </div>
          <div className="p-5 space-y-2.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{formatIDR(ppn)} × {order.nights} malam</span>
              <span className={discountPct > 0 ? "line-through text-muted-foreground/50" : ""}>
                {formatIDR(pricing!.baseSubtotal)}
              </span>
            </div>
            {discountPct > 0 && (
              <>
                <div className="flex justify-between items-center text-green-700 text-xs">
                  <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> Diskon {pricing!.discountLabel} ({discountPct}%)</span>
                  <span>−{formatIDR(pricing!.discountAmount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal kamar (setelah diskon)</span>
                  <span className="font-medium text-foreground">{formatIDR(pricing!.stayTotal)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>
                Deposit jaminan
                <span className="block text-xs text-muted-foreground/60">Dikembalikan saat check-out</span>
              </span>
              <span>{formatIDR(pricing!.deposit)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
              <span>Total Pembayaran</span>
              <span className="text-[#2d1a0e]">{formatIDR(pricing!.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Next steps berdasarkan status */}
        {order.status === "pending" && order.paymentStatus === "pending" && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
            <p className="font-semibold mb-2">⏳ Langkah Selanjutnya:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs leading-relaxed">
              <li>Scan QRIS / transfer sesuai jumlah total di atas</li>
              <li>Kirim bukti pembayaran ke WhatsApp kami</li>
              <li>Pesanan dikonfirmasi dalam 1×24 jam</li>
              <li>Simpan halaman ini untuk cek status pesananmu</li>
            </ol>
          </div>
        )}
        {order.status === "pending" && order.paymentStatus === "paid" && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
            <p className="font-semibold">💳 Pembayaran diterima!</p>
            <p className="text-xs mt-1">Pesananmu sedang diproses admin. Kamu akan mendapat konfirmasi segera.</p>
          </div>
        )}
        {order.status === "confirmed" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-sm text-green-800">
            <p className="font-semibold mb-2">✅ Pesananmu Sudah Dikonfirmasi!</p>
            <div className="flex items-start gap-2 text-xs">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Jl. Pleret Dalam IV No.6, Banyuanyar, Kec. Banjarsari, Kota Surakarta 57100</span>
            </div>
            <p className="text-xs mt-2">Tunjukkan kode pesanan <strong>{order.bookingRef}</strong> kepada penjaga saat tiba.</p>
          </div>
        )}
        {order.status === "cancelled" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-800">
            <p className="font-semibold">❌ Pesanan ini telah dibatalkan.</p>
            <p className="text-xs mt-1">Jika ada pertanyaan, hubungi kami via WhatsApp di bawah.</p>
          </div>
        )}

        {/* Simpan link halaman ini */}
        <div className="bg-[#2d1a0e]/5 border border-[#2d1a0e]/15 rounded-2xl p-4 text-sm">
          <p className="font-semibold text-foreground mb-1">🔖 Simpan Halaman Ini</p>
          <p className="text-xs text-muted-foreground mb-3">Bookmark halaman ini agar kamu bisa cek status pesanan kapan saja tanpa perlu login.</p>
          <div className="bg-white border border-border rounded-lg px-3 py-2 flex items-center gap-2 text-xs">
            <span className="flex-1 text-muted-foreground truncate">{orderUrl}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(orderUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="shrink-0 text-primary hover:underline"
            >
              {copied ? "Tersalin!" : "Salin"}
            </button>
          </div>
        </div>

        {/* CTA WhatsApp */}
        <a href={buildWhatsApp()} target="_blank" rel="noopener noreferrer">
          <Button className="w-full bg-[#25D366] hover:bg-[#1da851] text-white h-12 rounded-xl font-semibold text-base">
            <MessageCircle className="w-5 h-5 mr-2" />
            Hubungi Kami via WhatsApp
          </Button>
        </a>

        <Button variant="outline" onClick={() => navigate("/")} className="w-full rounded-xl h-11">
          <Home className="w-4 h-4 mr-2" /> Kembali ke Beranda
        </Button>

        <p className="text-xs text-center text-muted-foreground pb-4">
          Ndalem Pleret Guest House · ndalempleret.com
        </p>

      </div>
    </div>
  );
}
