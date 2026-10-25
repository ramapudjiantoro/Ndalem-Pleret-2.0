import { computePricing } from "@shared/pricing";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Booking {
  id: number; bookingRef: string; unitId: number; unitName: string;
  guestName: string; guestPhone: string; guestEmail: string;
  checkIn: string; checkOut: string; nights: number; totalPrice: number; pricePerNight?: number;
  status: string; paymentStatus: string; guestCount: number; notes?: string; adminNotes?: string;
  createdAt: string;
}
export interface BlockedDate { id: number; unitId: number; date: string; reason?: string; }
export interface Unit { id: number; name: string; slug: string; pricePerNight: number; }

// Harga total yang DIBAYAR customer (kamar setelah diskon + deposit) — satu sumber: shared/pricing.
export function grandTotalOf(b: { pricePerNight?: number; totalPrice: number; nights: number }): number {
  const ppn = b.pricePerNight ?? (b.nights > 0 ? Math.round(b.totalPrice / b.nights) : 0);
  return computePricing(ppn, b.nights).grandTotal;
}

// ─── Constants ────────────────────────────────────────────────────────────────
export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40",
  confirmed: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/40",
  cancelled: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/40",
};
export const PAYMENT_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-600/40",
  paid: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40",
};
export const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu", confirmed: "Dikonfirmasi", cancelled: "Dibatalkan",
};
export const PAYMENT_LABELS: Record<string, string> = {
  pending: "Belum Bayar", paid: "Sudah Bayar",
};
