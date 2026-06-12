// =============================================================================
// shared/pricing.ts — SATU SUMBER KEBENARAN untuk semua perhitungan harga.
// Dipakai oleh: BookingModal (date-picker), server (routes + email),
// OrderPage, dan Admin. Jangan duplikasi logika diskon di tempat lain.
// =============================================================================

export const DEPOSIT = 500_000;

// Tier diskon berdasarkan lama menginap (malam).
export function getDiscount(nights: number): { pct: number; label: string } {
  if (nights >= 21) return { pct: 12, label: `3 Minggu (${nights} malam)` };
  if (nights >= 14) return { pct: 8,  label: `2 Minggu (${nights} malam)` };
  if (nights >= 7)  return { pct: 5,  label: `1 Minggu (${nights} malam)` };
  return { pct: 0, label: "" };
}

export interface Pricing {
  pricePerNight: number;
  nights: number;
  baseSubtotal: number;   // pricePerNight * nights (SEBELUM diskon)
  discountPct: number;
  discountLabel: string;
  discountAmount: number;
  stayTotal: number;      // harga kamar SETELAH diskon, TANPA deposit (== totalPrice tersimpan)
  deposit: number;
  grandTotal: number;     // stayTotal + deposit (yang dibayar customer di QRIS)
}

// Hitung semua angka harga dari tarif/malam dan jumlah malam.
// Diskon dihitung dari TOTAL harga kamar (subtotal), lalu deposit ditambahkan
// hanya pada grandTotal (yang dibayar di halaman QRIS).
export function computePricing(pricePerNight: number, nights: number): Pricing {
  const n = Math.max(0, Math.trunc(nights || 0));
  const baseSubtotal = pricePerNight * n;
  const { pct, label } = getDiscount(n);
  const discountAmount = Math.round(baseSubtotal * pct / 100);
  const stayTotal = baseSubtotal - discountAmount;
  const deposit = n > 0 ? DEPOSIT : 0;
  return {
    pricePerNight,
    nights: n,
    baseSubtotal,
    discountPct: pct,
    discountLabel: label,
    discountAmount,
    stayTotal,
    deposit,
    grandTotal: stayTotal + deposit,
  };
}
