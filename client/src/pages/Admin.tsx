import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Lock, LogOut, RefreshCw, Check, X, Banknote, Calendar, User,
  Phone, Mail, BedDouble, ChevronDown, ChevronUp, Plus, Trash2,
  AlertTriangle, Eye, EyeOff, ChevronLeft, ChevronRight,
  StickyNote, Pencil, Download, FileText, FileSpreadsheet, Printer, Filter,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatIDR } from "@/hooks/use-units";
import { getDaysInMonth, addMonths, isBefore, isToday, format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Booking {
  id: number; bookingRef: string; unitId: number; unitName: string;
  guestName: string; guestPhone: string; guestEmail: string;
  checkIn: string; checkOut: string; nights: number; totalPrice: number;
  status: string; paymentStatus: string; guestCount: number; notes?: string; adminNotes?: string;
  createdAt: string;
}
interface BlockedDate { id: number; unitId: number; date: string; reason?: string; }

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40",
  confirmed: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/40",
  cancelled: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/40",
};
const PAYMENT_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-600/40",
  paid: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu", confirmed: "Dikonfirmasi", cancelled: "Dibatalkan",
};
const PAYMENT_LABELS: Record<string, string> = {
  pending: "Belum Bayar", paid: "Sudah Bayar",
};

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Password salah"); return; }
      onLogin(data.token);
    } catch {
      setError("Koneksi gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-card rounded-2xl shadow-xl border border-border/50 p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-display">Admin Panel</h1>
          <p className="text-muted-foreground text-sm mt-1">Ndalem Pleret Guest House</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="password">Password Admin</Label>
            <div className="relative mt-1">
              <Input id="password" type={showPassword ? "text" : "password"} className="pr-10" placeholder="Masukkan password"
                value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
              <AlertTriangle className="w-4 h-4" />{error}
            </div>
          )}
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? "Memproses..." : "Masuk"}
          </Button>
        </form>
        <p className="text-xs text-center text-muted-foreground mt-4">
          Default: <code className="bg-muted px-1 rounded">ndalem2025</code> · Ubah via env <code className="bg-muted px-1 rounded">ADMIN_PASSWORD</code>
        </p>
      </div>
    </div>
  );
}

// ─── Booking Row ──────────────────────────────────────────────────────────────
function BookingRow({ booking, token, onRefresh }: { booking: Booking; token: string; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(booking.adminNotes ?? "");

  async function update(field: "status" | "paymentStatus", value: string) {
    setLoading(true);
    await fetch(`/api/admin/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ [field]: value }),
    });
    setLoading(false);
    onRefresh();
  }

  async function saveAdminNotes() {
    setLoading(true);
    await fetch(`/api/admin/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ adminNotes: notesDraft }),
    });
    setLoading(false);
    setEditingNotes(false);
    onRefresh();
  }

  async function deleteBooking() {
    setLoading(true);
    await fetch(`/api/admin/bookings/${booking.id}`, {
      method: "DELETE",
      headers: { "x-admin-token": token },
    });
    setLoading(false);
    setConfirmDelete(false);
    onRefresh();
  }

  return (
    <div className="bg-white dark:bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm">
      <div
        className="flex items-start justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-primary">{booking.bookingRef}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[booking.status] ?? ""}`}>
              {STATUS_LABELS[booking.status] ?? booking.status}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PAYMENT_COLORS[booking.paymentStatus] ?? ""}`}>
              {PAYMENT_LABELS[booking.paymentStatus] ?? booking.paymentStatus}
            </span>
          </div>
          <p className="font-semibold text-sm mt-1">{booking.guestName}</p>
          <p className="text-xs text-muted-foreground">{booking.unitName} · {booking.nights} malam · {formatIDR(booking.totalPrice)}</p>
          <p className="text-xs text-muted-foreground">{booking.checkIn} → {booking.checkOut}</p>
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/50 p-4 space-y-4 bg-muted/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /><a href={`tel:${booking.guestPhone}`} className="text-primary hover:underline">{booking.guestPhone}</a></div>
            <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground truncate">{booking.guestEmail}</span></div>
            <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /><span>{booking.guestCount} tamu</span></div>
            <div className="flex items-center gap-2"><BedDouble className="w-4 h-4 text-muted-foreground" /><span>{booking.unitName}</span></div>
          </div>
          {booking.notes && <p className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg">📝 {booking.notes}</p>}

          {/* ── Admin Notes ── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5" /> Catatan Admin
              </span>
              {!editingNotes && (
                <button
                  onClick={() => { setNotesDraft(booking.adminNotes ?? ""); setEditingNotes(true); }}
                  className="text-xs text-primary hover:underline flex items-center gap-1 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  {booking.adminNotes ? "Edit" : "Tambah Catatan"}
                </button>
              )}
            </div>

            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  className="w-full text-xs border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={3}
                  placeholder="Tulis catatan internal untuk booking ini..."
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs rounded-lg" onClick={saveAdminNotes} disabled={loading}>
                    <Check className="w-3 h-3 mr-1" /> Simpan
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg text-muted-foreground" onClick={() => setEditingNotes(false)} disabled={loading}>
                    Batal
                  </Button>
                </div>
              </div>
            ) : booking.adminNotes ? (
              <p className="text-xs text-foreground bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 p-3 rounded-lg whitespace-pre-wrap">
                {booking.adminNotes}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/50 italic">Belum ada catatan admin</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {booking.status === "pending" && (
              <>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white rounded-lg h-8 text-xs" onClick={() => update("status", "confirmed")} disabled={loading}>
                  <Check className="w-3 h-3 mr-1" /> Konfirmasi
                </Button>
                <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg h-8 text-xs" onClick={() => update("status", "cancelled")} disabled={loading}>
                  <X className="w-3 h-3 mr-1" /> Batalkan
                </Button>
              </>
            )}
            {booking.status === "confirmed" && (
              <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg h-8 text-xs" onClick={() => update("status", "cancelled")} disabled={loading}>
                <X className="w-3 h-3 mr-1" /> Batalkan
              </Button>
            )}
            {booking.paymentStatus === "pending" && booking.status !== "cancelled" && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-8 text-xs" onClick={() => update("paymentStatus", "paid")} disabled={loading}>
                <Banknote className="w-3 h-3 mr-1" /> Tandai Lunas
              </Button>
            )}
            <a
              href={`https://wa.me/${booking.guestPhone.replace(/[^0-9]/g, "").replace(/^0/, "62")}?text=${encodeURIComponent(`Halo ${booking.guestName}, pemesanan Anda di Ndalem Pleret (${booking.bookingRef}) telah dikonfirmasi! `)}`}
              target="_blank" rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/30">
                <Phone className="w-3 h-3 mr-1" /> WA Tamu
              </Button>
            </a>

            {/* Delete button — muncul untuk semua status */}
            {!confirmDelete ? (
              <Button
                size="sm" variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg h-8 text-xs ml-auto"
                onClick={() => setConfirmDelete(true)}
                disabled={loading}
              >
                <Trash2 className="w-3 h-3 mr-1" /> Hapus Data
              </Button>
            ) : (
              <div className="ml-auto flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg px-3 py-1.5">
                <span className="text-xs text-red-700 dark:text-red-400 font-medium">Hapus permanen?</span>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white h-6 text-xs px-2 rounded" onClick={deleteBooking} disabled={loading}>
                  Ya, Hapus
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs px-2 rounded text-muted-foreground" onClick={() => setConfirmDelete(false)} disabled={loading}>
                  Batal
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Download Panel ───────────────────────────────────────────────────────────
interface DownloadFilters {
  dateFrom: string; dateTo: string;
  status: string; paymentStatus: string; unitId: string;
}

function DownloadPanel({ bookings, onClose }: { bookings: Booking[]; onClose: () => void }) {
  const [filters, setFilters] = useState<DownloadFilters>({
    dateFrom: "", dateTo: "", status: "all", paymentStatus: "all", unitId: "all",
  });
  const [format, setFormat] = useState<"csv" | "xlsx" | "pdf">("csv");
  const [loading, setLoading] = useState(false);

  function applyFilters(data: Booking[]): Booking[] {
    return data.filter((b) => {
      if (filters.status !== "all" && b.status !== filters.status) return false;
      if (filters.paymentStatus !== "all" && b.paymentStatus !== filters.paymentStatus) return false;
      if (filters.unitId !== "all" && String(b.unitId) !== filters.unitId) return false;
      if (filters.dateFrom && b.checkIn.slice(0, 10) < filters.dateFrom) return false;
      if (filters.dateTo && b.checkIn.slice(0, 10) > filters.dateTo) return false;
      return true;
    });
  }

  const filtered = applyFilters(bookings);

  function todayStr() { return new Date().toISOString().slice(0, 10); }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function downloadCSV() {
    const data = applyFilters(bookings);
    const headers = [
      "Kode Booking", "Nama Tamu", "No. Telepon", "Email", "Unit",
      "Check-in", "Check-out", "Malam", "Total Harga (IDR)", "Jumlah Tamu",
      "Status Booking", "Status Pembayaran", "Catatan Tamu", "Catatan Admin", "Tanggal Pesan",
    ];
    const rows = data.map((b) => [
      b.bookingRef, b.guestName, b.guestPhone, b.guestEmail, b.unitName,
      b.checkIn.slice(0, 10), b.checkOut.slice(0, 10), b.nights, b.totalPrice, b.guestCount,
      STATUS_LABELS[b.status] ?? b.status,
      PAYMENT_LABELS[b.paymentStatus] ?? b.paymentStatus,
      b.notes ?? "", b.adminNotes ?? "",
      b.createdAt ? new Date(b.createdAt).toLocaleDateString("id-ID") : "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, `booking-ndalempleret-${todayStr()}.csv`);
  }

  async function downloadXLSX() {
    setLoading(true);
    try {
      const XLSX = await import("xlsx");
      const data = applyFilters(bookings);
      const rows = data.map((b) => ({
        "Kode Booking": b.bookingRef,
        "Nama Tamu": b.guestName,
        "No. Telepon": b.guestPhone,
        "Email": b.guestEmail,
        "Unit": b.unitName,
        "Check-in": b.checkIn.slice(0, 10),
        "Check-out": b.checkOut.slice(0, 10),
        "Malam": b.nights,
        "Total Harga (IDR)": b.totalPrice,
        "Jumlah Tamu": b.guestCount,
        "Status Booking": STATUS_LABELS[b.status] ?? b.status,
        "Status Pembayaran": PAYMENT_LABELS[b.paymentStatus] ?? b.paymentStatus,
        "Catatan Tamu": b.notes ?? "",
        "Catatan Admin": b.adminNotes ?? "",
        "Tanggal Pesan": b.createdAt ? new Date(b.createdAt).toLocaleDateString("id-ID") : "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      // Auto-width columns
      const keys = Object.keys(rows[0] ?? {});
      ws["!cols"] = keys.map((key) => ({
        wch: Math.max(key.length, ...rows.map((r) => String((r as Record<string,unknown>)[key] ?? "").length)) + 2,
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data Booking");
      XLSX.writeFile(wb, `booking-ndalempleret-${todayStr()}.xlsx`);
    } finally {
      setLoading(false);
    }
  }

  function downloadPDF() {
    const data = applyFilters(bookings);
    const tableRows = data.map((b) => `
      <tr>
        <td>${b.bookingRef}</td>
        <td>${b.guestName}</td>
        <td>${b.unitName}</td>
        <td>${b.checkIn.slice(0, 10)}</td>
        <td>${b.checkOut.slice(0, 10)}</td>
        <td style="text-align:center">${b.nights}</td>
        <td style="text-align:right">Rp ${b.totalPrice.toLocaleString("id-ID")}</td>
        <td style="text-align:center">${b.guestCount}</td>
        <td><span class="badge ${b.status}">${STATUS_LABELS[b.status] ?? b.status}</span></td>
        <td><span class="badge ${b.paymentStatus === "paid" ? "paid" : "unpaid"}">${PAYMENT_LABELS[b.paymentStatus] ?? b.paymentStatus}</span></td>
        <td>${b.guestPhone}</td>
        <td>${b.adminNotes ?? "-"}</td>
      </tr>`).join("");

    const filterDesc: string[] = [];
    if (filters.dateFrom) filterDesc.push(`Check-in ≥ ${filters.dateFrom}`);
    if (filters.dateTo) filterDesc.push(`Check-in ≤ ${filters.dateTo}`);
    if (filters.status !== "all") filterDesc.push(`Status: ${STATUS_LABELS[filters.status]}`);
    if (filters.paymentStatus !== "all") filterDesc.push(`Bayar: ${PAYMENT_LABELS[filters.paymentStatus]}`);
    if (filters.unitId !== "all") filterDesc.push(`Unit: ${filters.unitId === "1" ? "Ndalem Belakang" : "Ndalem Tengah"}`);

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"/>
<title>Data Booking — Ndalem Pleret</title>
<style>
  body{font-family:Arial,sans-serif;font-size:10px;margin:20px;color:#1a1a1a}
  h1{font-size:15px;margin:0 0 2px}
  .meta{font-size:9px;color:#666;margin-bottom:14px}
  table{width:100%;border-collapse:collapse}
  th{background:#111827;color:#fff;padding:6px 8px;text-align:left;font-size:9px;white-space:nowrap}
  td{padding:5px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top;font-size:9px}
  tr:nth-child(even) td{background:#f9fafb}
  .badge{padding:2px 6px;border-radius:999px;font-size:8px;font-weight:bold;white-space:nowrap}
  .pending{background:#fef3c7;color:#92400e}
  .confirmed{background:#d1fae5;color:#065f46}
  .cancelled{background:#fee2e2;color:#991b1b}
  .paid{background:#dbeafe;color:#1e3a8a}
  .unpaid{background:#f3f4f6;color:#374151}
  @media print{body{margin:0}button{display:none!important}}
</style></head>
<body>
  <h1>📋 Data Booking — Ndalem Pleret Guest House</h1>
  <p class="meta">
    Dicetak: ${new Date().toLocaleString("id-ID")} &nbsp;·&nbsp;
    Total: <strong>${data.length} booking</strong>
    ${filterDesc.length ? `&nbsp;·&nbsp; Filter: ${filterDesc.join(", ")}` : ""}
  </p>
  <table>
    <thead><tr>
      <th>Kode</th><th>Nama Tamu</th><th>Unit</th><th>Check-in</th><th>Check-out</th>
      <th>Malam</th><th>Total</th><th>Tamu</th><th>Status</th><th>Bayar</th>
      <th>No. HP</th><th>Catatan Admin</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <script>window.onload=function(){window.print()}<\/script>
</body></html>`;

    const win = window.open("", "_blank", "width=1200,height=850");
    if (!win) { alert("Pop-up diblokir browser. Izinkan pop-up untuk menggunakan fitur ini."); return; }
    win.document.write(html);
    win.document.close();
  }

  async function handleDownload() {
    if (format === "csv") downloadCSV();
    else if (format === "xlsx") await downloadXLSX();
    else downloadPDF();
  }

  return (
    <div className="bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-primary/5">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">Unduh Data Booking</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Filters */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Filter Data
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Check-in Dari</Label>
              <Input type="date" value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Check-in Sampai</Label>
              <Input type="date" value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Status Booking</Label>
              <select className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="confirmed">Dikonfirmasi</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Status Pembayaran</Label>
              <select className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={filters.paymentStatus} onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value }))}>
                <option value="all">Semua Pembayaran</option>
                <option value="pending">Belum Bayar</option>
                <option value="paid">Sudah Bayar</option>
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Unit</Label>
              <select className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={filters.unitId} onChange={(e) => setFilters((f) => ({ ...f, unitId: e.target.value }))}>
                <option value="all">Semua Unit</option>
                <option value="1">Ndalem Belakang</option>
                <option value="2">Ndalem Tengah</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ dateFrom: "", dateTo: "", status: "all", paymentStatus: "all", unitId: "all" })}
                className="w-full text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors hover:bg-muted"
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>

        {/* Preview count */}
        <div className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2.5 font-medium
          ${filtered.length > 0
            ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700/40"
            : "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/40"}`}>
          <span className="text-2xl font-bold font-mono leading-none">{filtered.length}</span>
          <span>data booking akan diunduh</span>
        </div>

        {/* Format selector */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Format File</p>
          <div className="grid grid-cols-3 gap-3">
            {([
              { id: "csv" as const, label: "CSV", desc: "Excel & Google Sheets", icon: <FileText className="w-5 h-5" /> },
              { id: "xlsx" as const, label: "Excel (.xlsx)", desc: "Microsoft Excel", icon: <FileSpreadsheet className="w-5 h-5" /> },
              { id: "pdf" as const, label: "PDF / Print", desc: "Cetak atau simpan PDF", icon: <Printer className="w-5 h-5" /> },
            ] as const).map(({ id, label, desc, icon }) => (
              <button
                key={id}
                onClick={() => setFormat(id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center
                  ${format === id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"}`}
              >
                {icon}
                <div>
                  <p className="text-xs font-semibold leading-tight">{label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Download button */}
        <Button
          className="w-full h-11 text-sm font-semibold"
          onClick={handleDownload}
          disabled={filtered.length === 0 || loading}
        >
          {loading
            ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Menyiapkan...</>
            : <><Download className="w-4 h-4 mr-2" /> Unduh {filtered.length} Data ({format === "pdf" ? "PDF" : format.toUpperCase()})</>
          }
        </Button>
      </div>
    </div>
  );
}

// ─── Admin Calendar Preview ───────────────────────────────────────────────────
const DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

/** Expands a booking's check-in → check-out range into individual date strings */
function expandBookingDates(bookings: Booking[], unitId: number): Map<string, Booking> {
  const map = new Map<string, Booking>();
  for (const b of bookings) {
    if (b.unitId !== unitId || b.status === "cancelled") continue;
    let cur = b.checkIn.slice(0, 10);
    const last = b.checkOut.slice(0, 10);
    while (cur < last) {
      map.set(cur, b);
      const d = new Date(cur + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + 1);
      cur = d.toISOString().slice(0, 10);
    }
  }
  return map;
}

function AdminCalendarGrid({
  month, year, bookedMap, blockedSet,
}: {
  month: number;
  year: number;
  bookedMap: Map<string, Booking>;
  blockedSet: Set<string>;
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = getDaysInMonth(new Date(year, month));

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS_ID.map((d) => (
          <div key={d} className="text-center text-[10px] text-muted-foreground py-1 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} className="h-7" />;
          const date = new Date(year, month, day);
          const ds = format(date, "yyyy-MM-dd");
          const isPast = isBefore(date, today);
          const isCurrentDay = isToday(date);
          const booking = bookedMap.get(ds);
          const isBlocked = blockedSet.has(ds);

          let cellClass = "h-7 rounded flex items-center justify-center text-[11px] font-medium transition-colors relative";
          let title = "";

          if (isPast) {
            cellClass += " text-muted-foreground/25";
          } else if (booking) {
            const isPending = booking.status === "pending";
            cellClass += isPending
              ? " bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 cursor-default"
              : " bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 cursor-default";
            title = `${booking.guestName} · ${booking.bookingRef} (${isPending ? "Menunggu" : "Dikonfirmasi"})`;
          } else if (isBlocked) {
            cellClass += " bg-gray-200 text-gray-500 dark:bg-gray-700/60 dark:text-gray-400 cursor-default";
            title = "Diblokir";
          } else {
            cellClass += " bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400";
          }

          if (isCurrentDay && !isPast) {
            cellClass += " ring-2 ring-blue-400";
          }

          return (
            <div key={ds} className="relative group">
              <div className={cellClass} title={title}>{day}</div>
              {/* Tooltip on hover for booked dates */}
              {title && !isPast && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 pointer-events-none">
                  <div className="bg-gray-900 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl leading-snug">
                    {isBlocked ? "📵 Diblokir manual" : (
                      <>
                        <span className="font-semibold">{booking!.guestName}</span>
                        <br />
                        <span className="text-gray-300">{booking!.bookingRef}</span>
                        <span className={`ml-1.5 px-1 rounded text-[9px] font-bold ${booking!.status === "pending" ? "bg-amber-500" : "bg-red-500"} text-white`}>
                          {booking!.status === "pending" ? "PENDING" : "CONFIRMED"}
                        </span>
                      </>
                    )}
                  </div>
                  {/* Arrow */}
                  <div className="flex justify-center">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminCalendarPreview({ bookings, blockedDates }: { bookings: Booking[]; blockedDates: BlockedDate[] }) {
  const [viewMonth, setViewMonth] = useState(() => new Date());

  const today = new Date();
  const canGoPrev =
    viewMonth.getFullYear() > today.getFullYear() ||
    (viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() > today.getMonth());

  const UNITS = [
    { id: 1, name: "Ndalem Belakang" },
    { id: 2, name: "Ndalem Tengah" },
  ];

  // Build maps for each unit
  const unitData = UNITS.map((u) => {
    const bookedMap = expandBookingDates(bookings, u.id);
    const blockedSet = new Set(blockedDates.filter((bd) => bd.unitId === u.id).map((bd) => bd.date.slice(0, 10)));

    // Count stats for this month
    const daysInMonth = getDaysInMonth(viewMonth);
    let available = 0, booked = 0, blocked = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d);
      if (isBefore(date, today)) continue;
      const ds = format(date, "yyyy-MM-dd");
      if (bookedMap.has(ds)) booked++;
      else if (blockedSet.has(ds)) blocked++;
      else available++;
    }

    return { ...u, bookedMap, blockedSet, available, booked, blocked };
  });

  // Upcoming bookings in this month
  const monthStart = format(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1), "yyyy-MM-dd");
  const monthEnd = format(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0), "yyyy-MM-dd");
  const monthBookings = bookings.filter(
    (b) => b.status !== "cancelled" && b.checkIn.slice(0, 10) <= monthEnd && b.checkOut.slice(0, 10) > monthStart
  ).sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm p-4 flex items-center justify-between">
        <button
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          disabled={!canGoPrev}
          className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold font-display">
          {MONTHS_ID[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </h3>
        <button
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm p-4 flex flex-wrap gap-4 text-xs">
        {[
          { cls: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400", label: "Tersedia" },
          { cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", label: "Pending" },
          { cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", label: "Dikonfirmasi" },
          { cls: "bg-gray-200 text-gray-500 dark:bg-gray-700/60 dark:text-gray-400", label: "Diblokir manual" },
          { cls: "ring-2 ring-blue-400 text-xs", label: "Hari ini" },
        ].map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded ${cls} flex items-center justify-center font-medium`}>1</div>
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
        <span className="text-muted-foreground text-xs self-center">— Hover tanggal untuk detail tamu</span>
      </div>

      {/* Two Calendars Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {unitData.map((u) => (
          <div key={u.id} className="bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
            {/* Unit Header */}
            <div className="bg-primary/5 border-b border-border/50 px-5 py-3 flex items-center justify-between">
              <h4 className="font-bold text-sm">{u.name}</h4>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  <span className="text-muted-foreground">{u.available} tersedia</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  <span className="text-muted-foreground">{u.booked} terisi</span>
                </span>
                {u.blocked > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                    <span className="text-muted-foreground">{u.blocked} diblokir</span>
                  </span>
                )}
              </div>
            </div>

            <div className="p-5">
              <AdminCalendarGrid
                month={viewMonth.getMonth()}
                year={viewMonth.getFullYear()}
                bookedMap={u.bookedMap}
                blockedSet={u.blockedSet}
              />

              {/* Next month mini preview */}
              <div className="mt-5 pt-4 border-t border-border/30">
                <p className="text-[10px] text-muted-foreground mb-3 font-medium uppercase tracking-wider">
                  {MONTHS_ID[addMonths(viewMonth, 1).getMonth()]}
                </p>
                <AdminCalendarGrid
                  month={addMonths(viewMonth, 1).getMonth()}
                  year={addMonths(viewMonth, 1).getFullYear()}
                  bookedMap={u.bookedMap}
                  blockedSet={u.blockedSet}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Bookings in this month */}
      <div className="bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h4 className="font-bold text-sm">Pemesanan di {MONTHS_ID[viewMonth.getMonth()]} {viewMonth.getFullYear()}</h4>
          <span className="ml-auto text-xs text-muted-foreground">{monthBookings.length} booking</span>
        </div>
        {monthBookings.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Tidak ada pemesanan bulan ini</div>
        ) : (
          <div className="divide-y divide-border/30">
            {monthBookings.map((b) => (
              <div key={b.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                <div className="w-2 h-8 rounded-full shrink-0" style={{ background: b.status === "pending" ? "#f59e0b" : "#ef4444" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">{b.guestName}</span>
                    <span className="font-mono text-xs text-muted-foreground">{b.bookingRef}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {b.unitName} · {b.checkIn.slice(0, 10)} → {b.checkOut.slice(0, 10)} · {b.nights} malam
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs font-semibold">{formatIDR(b.totalPrice)}</div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] ?? ""}`}>
                    {STATUS_LABELS[b.status] ?? b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin Dashboard (all hooks here, after auth confirmed) ───────────────────
function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<"bookings" | "blocked" | "calendar">("bookings");
  const [blockForm, setBlockForm] = useState({ unitId: "1", date: "", reason: "" });
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDownload, setShowDownload] = useState(false);

  // ── Kosongkan Tanggal state ──
  const [clearForm, setClearForm] = useState({ unitId: "1", date: "" });
  const [clearResult, setClearResult] = useState<null | {
    type: "free" | "blocked" | "booked";
    blockedId?: number;
    blockedReason?: string;
    booking?: Booking;
  }>(null);
  const [clearLoading, setClearLoading] = useState(false);

  const headers = { "x-admin-token": token };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: bookings = [], refetch: refetchBookings } = useQuery<Booking[]>({
    queryKey: ["admin-bookings", token],
    queryFn: async () => {
      const res = await fetch("/api/admin/bookings", { headers });
      if (res.status === 401) { onLogout(); return []; }
      return res.json();
    },
  });

  const { data: blockedDates = [], refetch: refetchBlocked } = useQuery<BlockedDate[]>({
    queryKey: ["admin-blocked", token],
    queryFn: async () => {
      const res = await fetch("/api/admin/blocked-dates", { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

  async function handleRefresh() {
    setIsRefreshing(true);
    await Promise.all([refetchBookings(), refetchBlocked()]);
    setIsRefreshing(false);
  }

  async function addBlockedDate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/blocked-dates", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        unitId: parseInt(blockForm.unitId),
        date: blockForm.date,
        reason: blockForm.reason || undefined,
      }),
    });
    setBlockForm((f) => ({ ...f, date: "", reason: "" }));
    refetchBlocked();
  }

  async function removeBlockedDate(id: number) {
    await fetch(`/api/admin/blocked-dates/${id}`, { method: "DELETE", headers });
    refetchBlocked();
  }

  // ── Kosongkan: lookup tanggal di data yang sudah di-fetch ──
  function handleCheckDate() {
    const { unitId, date } = clearForm;
    if (!date) return;
    const uid = parseInt(unitId);

    // 1. Cek manual block
    const blockedEntry = blockedDates.find(
      (bd) => bd.unitId === uid && bd.date.slice(0, 10) === date
    );
    if (blockedEntry) {
      setClearResult({ type: "blocked", blockedId: blockedEntry.id, blockedReason: blockedEntry.reason ?? undefined });
      return;
    }

    // 2. Cek booking aktif (expand date ranges)
    const bookedMap = expandBookingDates(bookings, uid);
    const booking = bookedMap.get(date);
    if (booking) {
      setClearResult({ type: "booked", booking });
      return;
    }

    // 3. Bebas
    setClearResult({ type: "free" });
  }

  async function handleUnblockById(id: number) {
    setClearLoading(true);
    await fetch(`/api/admin/blocked-dates/${id}`, { method: "DELETE", headers });
    refetchBlocked();
    setClearResult(null);
    setClearForm((f) => ({ ...f, date: "" }));
    setClearLoading(false);
  }

  async function handleCancelBookingById(id: number) {
    setClearLoading(true);
    await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    refetchBookings();
    setClearResult(null);
    setClearForm((f) => ({ ...f, date: "" }));
    setClearLoading(false);
  }

  const filteredBookings = statusFilter === "all" ? bookings : bookings.filter((b) => b.status === statusFilter);
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const unpaidCount = bookings.filter((b) => b.paymentStatus === "pending" && b.status !== "cancelled").length;

  return (
    <div className="min-h-screen bg-secondary/30 font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-card border-b border-border/50 shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold font-display text-lg">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Ndalem Pleret Guest House</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="rounded-lg h-8 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 mr-1 transition-transform ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Memuat..." : "Refresh"}
            </Button>
            <Button size="sm" variant="outline" onClick={onLogout} className="rounded-lg h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30">
              <LogOut className="w-3.5 h-3.5 mr-1" /> Keluar
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Booking", value: bookings.length, color: "text-foreground" },
            { label: "Menunggu Konfirmasi", value: pendingCount, color: "text-amber-600" },
            { label: "Belum Lunas", value: unpaidCount, color: "text-red-600" },
            { label: "Dikonfirmasi", value: bookings.filter((b) => b.status === "confirmed").length, color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white dark:bg-card rounded-xl p-4 border border-border/50 shadow-sm">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold font-display ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border overflow-x-auto">
          {[
            { id: "bookings" as const, label: "Pemesanan" },
            { id: "calendar" as const, label: "Preview Kalender" },
            { id: "blocked" as const, label: "Kelola Tanggal" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: "all", label: "Semua" },
                { value: "pending", label: "Menunggu" },
                { value: "confirmed", label: "Dikonfirmasi" },
                { value: "cancelled", label: "Dibatalkan" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${statusFilter === f.value ? "bg-primary text-white" : "bg-white dark:bg-muted border border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  {f.label} ({f.value === "all" ? bookings.length : bookings.filter((b) => b.status === f.value).length})
                </button>
              ))}
              <button
                onClick={() => setShowDownload((v) => !v)}
                className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${showDownload ? "bg-primary text-white border-primary" : "bg-white dark:bg-muted border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Data
              </button>
            </div>

            {showDownload && (
              <DownloadPanel bookings={bookings} onClose={() => setShowDownload(false)} />
            )}

            {filteredBookings.length === 0 ? (
              <div className="bg-white dark:bg-card rounded-xl border border-border/50 p-12 text-center text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Belum ada pemesanan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...filteredBookings].reverse().map((b) => (
                  <BookingRow key={b.id} booking={b} token={token} onRefresh={handleRefresh} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calendar Preview Tab */}
        {activeTab === "calendar" && (
          <AdminCalendarPreview bookings={bookings} blockedDates={blockedDates} />
        )}

        {/* Kelola Tanggal Tab */}
        {activeTab === "blocked" && (
          <div className="space-y-6">

            {/* ── Two-panel: Blokir + Kosongkan ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Panel kiri: Blokir Tanggal */}
              <div className="bg-white dark:bg-card rounded-xl border border-border/50 p-5 shadow-sm flex flex-col gap-4">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                  Blokir Tanggal
                </h3>
                <p className="text-xs text-muted-foreground -mt-2">
                  Tandai tanggal sebagai tidak tersedia (maintenance, keperluan pribadi, dll).
                </p>
                <form onSubmit={addBlockedDate} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1 block">Unit</Label>
                      <select
                        className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        value={blockForm.unitId}
                        onChange={(e) => setBlockForm((f) => ({ ...f, unitId: e.target.value }))}
                      >
                        <option value="1">Ndalem Belakang</option>
                        <option value="2">Ndalem Tengah</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Tanggal</Label>
                      <Input type="date" value={blockForm.date} onChange={(e) => setBlockForm((f) => ({ ...f, date: e.target.value }))} required />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Alasan (opsional)</Label>
                    <Input placeholder="Contoh: Maintenance, Acara Keluarga" value={blockForm.reason} onChange={(e) => setBlockForm((f) => ({ ...f, reason: e.target.value }))} />
                  </div>
                  <Button type="submit" className="w-full rounded-lg h-9 text-sm bg-red-600 hover:bg-red-700">
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Blokir Tanggal Ini
                  </Button>
                </form>
              </div>

              {/* Panel kanan: Kosongkan Tanggal */}
              <div className="bg-white dark:bg-card rounded-xl border border-border/50 p-5 shadow-sm flex flex-col gap-4">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <X className="w-3.5 h-3.5" />
                  </span>
                  Kosongkan Tanggal
                </h3>
                <p className="text-xs text-muted-foreground -mt-2">
                  Periksa tanggal tertentu — hapus blokir manual atau batalkan booking yang ada.
                </p>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1 block">Unit</Label>
                      <select
                        className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        value={clearForm.unitId}
                        onChange={(e) => { setClearForm((f) => ({ ...f, unitId: e.target.value })); setClearResult(null); }}
                      >
                        <option value="1">Ndalem Belakang</option>
                        <option value="2">Ndalem Tengah</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Tanggal</Label>
                      <Input
                        type="date"
                        value={clearForm.date}
                        onChange={(e) => { setClearForm((f) => ({ ...f, date: e.target.value })); setClearResult(null); }}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-lg h-9 text-sm"
                    onClick={handleCheckDate}
                    disabled={!clearForm.date}
                  >
                    <Calendar className="w-3.5 h-3.5 mr-1.5" /> Periksa Tanggal Ini
                  </Button>
                </div>

                {/* Result panel */}
                {clearResult && (
                  <div className={`rounded-xl p-4 border text-sm space-y-3 ${
                    clearResult.type === "free"    ? "bg-green-50 border-green-200" :
                    clearResult.type === "blocked" ? "bg-amber-50 border-amber-200" :
                                                     "bg-red-50 border-red-200"
                  }`}>
                    {clearResult.type === "free" && (
                      <div className="flex items-center gap-2 text-green-700">
                        <Check className="w-4 h-4 shrink-0" />
                        <span className="font-medium">Tanggal ini sudah kosong & tersedia.</span>
                      </div>
                    )}

                    {clearResult.type === "blocked" && (
                      <>
                        <div className="text-amber-800">
                          <p className="font-semibold flex items-center gap-1.5 mb-1">
                            <AlertTriangle className="w-4 h-4" /> Diblokir manual
                          </p>
                          {clearResult.blockedReason && (
                            <p className="text-xs text-amber-700">Alasan: <em>{clearResult.blockedReason}</em></p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="w-full rounded-lg h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs"
                          onClick={() => handleUnblockById(clearResult.blockedId!)}
                          disabled={clearLoading}
                        >
                          {clearLoading ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                          Hapus Blokir — Jadikan Tersedia
                        </Button>
                      </>
                    )}

                    {clearResult.type === "booked" && clearResult.booking && (
                      <>
                        <div className="text-red-800 space-y-1">
                          <p className="font-semibold flex items-center gap-1.5">
                            <BedDouble className="w-4 h-4" /> Ada booking aktif
                          </p>
                          <p className="text-xs"><span className="font-medium">Tamu:</span> {clearResult.booking.guestName}</p>
                          <p className="text-xs"><span className="font-medium">Kode:</span> <span className="font-mono">{clearResult.booking.bookingRef}</span></p>
                          <p className="text-xs"><span className="font-medium">Periode:</span> {clearResult.booking.checkIn.slice(0,10)} → {clearResult.booking.checkOut.slice(0,10)} ({clearResult.booking.nights} malam)</p>
                          <p className="text-xs"><span className="font-medium">Status:</span> {STATUS_LABELS[clearResult.booking.status] ?? clearResult.booking.status}</p>
                          <p className="text-xs text-red-600 mt-1">⚠️ Membatalkan akan membebaskan seluruh rentang tanggal booking ini.</p>
                        </div>
                        <Button
                          size="sm"
                          className="w-full rounded-lg h-8 bg-red-600 hover:bg-red-700 text-white text-xs"
                          onClick={() => handleCancelBookingById(clearResult.booking!.id)}
                          disabled={clearLoading}
                        >
                          {clearLoading ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <X className="w-3 h-3 mr-1" />}
                          Batalkan Booking — Kosongkan Tanggal
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Daftar Tanggal Diblokir ── */}
            <div className="bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-bold text-sm">Tanggal Diblokir Manual ({blockedDates.length})</h3>
                <span className="text-xs text-muted-foreground">Klik 🗑 untuk hapus</span>
              </div>
              {blockedDates.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Belum ada tanggal yang diblokir manual</div>
              ) : (
                <div className="divide-y divide-border/30">
                  {[...blockedDates]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((bd) => (
                    <div key={bd.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
                        <div>
                          <span className="text-sm font-medium">{bd.date.slice(0, 10)}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {bd.unitId === 1 ? "Ndalem Belakang" : "Ndalem Tengah"}
                          </span>
                          {bd.reason && (
                            <span className="text-xs text-muted-foreground ml-2">— {bd.reason}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeBlockedDate(bd.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                        title="Hapus blokir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root: handles auth gate ───────────────────────────────────────────────────
export default function Admin() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("admin_token"));

  function handleLogin(t: string) {
    setToken(t);
    sessionStorage.setItem("admin_token", t);
  }

  function handleLogout() {
    setToken(null);
    sessionStorage.removeItem("admin_token");
  }

  if (!token) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <AdminDashboard token={token} onLogout={handleLogout} />;
}
