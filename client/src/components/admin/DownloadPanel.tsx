import { useState } from "react";
import { RefreshCw, X, Download, FileText, FileSpreadsheet, Printer, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Booking, grandTotalOf, STATUS_LABELS, PAYMENT_LABELS } from "./types";

// ─── Download Panel ───────────────────────────────────────────────────────────
interface DownloadFilters {
  dateFrom: string; dateTo: string;
  status: string; paymentStatus: string; unitId: string;
}

export function DownloadPanel({ bookings, onClose }: { bookings: Booking[]; onClose: () => void }) {
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
      b.checkIn.slice(0, 10), b.checkOut.slice(0, 10), b.nights, grandTotalOf(b), b.guestCount,
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
        "Total Harga (IDR)": grandTotalOf(b),
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
        <td style="text-align:right">Rp ${grandTotalOf(b).toLocaleString("id-ID")}</td>
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
          <h3 className="font-bold text-sm">Export Data Booking</h3>
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
            : <><Download className="w-4 h-4 mr-2" /> Export {filtered.length} Data ({format === "pdf" ? "PDF" : format.toUpperCase()})</>
          }
        </Button>
      </div>
    </div>
  );
}
