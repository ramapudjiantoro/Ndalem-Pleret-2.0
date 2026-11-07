import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogOut, RefreshCw, Calendar, Download, Bell, BellRing } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Booking, BlockedDate, Unit } from "./types";
import { adminFetch } from "./api";
import { useAdminNotifications } from "./useAdminNotifications";
import { NotifPanel } from "./NotifPanel";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { BookingRow } from "./BookingRow";
import { DownloadPanel } from "./DownloadPanel";
import { AdminCalendarPreview } from "./AdminCalendar";
import { BlockedDatesManager } from "./BlockedDatesManager";
import { UnitPriceCard } from "./UnitPriceCard";

// ─── Admin Dashboard (all hooks here, after auth confirmed) ───────────────────
export function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<"bookings" | "blocked" | "calendar" | "pricing">("bookings");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDownload, setShowDownload] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);



  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: bookings = [], refetch: refetchBookings } = useQuery<Booking[]>({
    queryKey: ["admin-bookings", token],
    queryFn: async () => {
      const res = await adminFetch(token, "/api/admin/bookings");
      if (res.status === 401) { onLogout(); return []; }
      return res.json();
    },
    refetchInterval: 30_000, // auto-poll setiap 30 detik untuk deteksi booking baru
  });

  const { data: blockedDates = [], refetch: refetchBlocked } = useQuery<BlockedDate[]>({
    queryKey: ["admin-blocked", token],
    queryFn: async () => {
      const res = await adminFetch(token, "/api/admin/blocked-dates");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: units = [], refetch: refetchUnits } = useQuery<Unit[]>({
    queryKey: ["admin-units"],
    queryFn: async () => {
      const res = await fetch("/api/units");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const notif = useAdminNotifications(bookings, token);

  // Tutup notif panel saat klik di luar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    }
    if (showNotifPanel) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifPanel]);

  // Update page title dengan badge unread
  useEffect(() => {
    document.title = notif.unread > 0
      ? `(${notif.unread}) Admin Dashboard · Ndalem Pleret`
      : "Admin Dashboard · Ndalem Pleret";
    return () => { document.title = "Ndalem Pleret"; };
  }, [notif.unread]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await Promise.all([refetchBookings(), refetchBlocked()]);
    setIsRefreshing(false);
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
            <h1 className="font-bold font-display text-base sm:text-lg leading-tight">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">Ndalem Pleret Guest House</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Bell notifikasi */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setShowNotifPanel((v) => !v); if (!showNotifPanel) notif.markAllRead(); }}
                className={`relative h-8 w-8 flex items-center justify-center rounded-lg border transition-colors
                  ${showNotifPanel
                    ? "bg-primary text-white border-primary"
                    : "border-border bg-white dark:bg-card hover:bg-muted text-foreground"}`}
                title="Notifikasi"
              >
                {notif.unread > 0
                  ? <BellRing className="w-4 h-4 animate-[wiggle_0.5s_ease-in-out_infinite]" />
                  : <Bell className="w-4 h-4" />}
                {notif.unread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                    {notif.unread > 9 ? "9+" : notif.unread}
                  </span>
                )}
              </button>

              {showNotifPanel && (
                <NotifPanel
                  notifs={notif.notifs}
                  unread={notif.unread}
                  permission={notif.permission}
                  onRequestPermission={notif.requestPermission}
                  onMarkAllRead={notif.markAllRead}
                  onClearAll={notif.clearAll}
                  onClose={() => setShowNotifPanel(false)}
                />
              )}
            </div>

            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="rounded-lg h-8 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 mr-1 transition-transform ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Memuat..." : "Refresh"}
            </Button>
            <Button size="sm" variant="outline" onClick={onLogout} className="hidden md:flex rounded-lg h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30">
              <LogOut className="w-3.5 h-3.5 mr-1" /> Keluar
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-6">
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
            { id: "pricing" as const, label: "Harga" },
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
                className={`ml-auto hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${showDownload ? "bg-primary text-white border-primary" : "bg-white dark:bg-muted border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
              >
                <Download className="w-3.5 h-3.5" />
                Export Data
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
          <div className="space-y-6">
            <AdminCalendarPreview bookings={bookings} blockedDates={blockedDates} />
          </div>
        )}

        {/* Harga Tab */}
        {activeTab === "pricing" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Ubah harga per malam tiap unit. Harga baru otomatis dipakai untuk pemesanan berikutnya —
              termasuk perhitungan diskon, total tagihan, dan email yang dikirim ke tamu.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {units.map((unit) => (
                <UnitPriceCard key={unit.id} unit={unit} token={token} onRefresh={refetchUnits} />
              ))}
            </div>
          </div>
        )}

        {/* Kelola Tanggal Tab */}
        {activeTab === "blocked" && (
          <BlockedDatesManager
            token={token}
            bookings={bookings}
            blockedDates={blockedDates}
            refetchBlocked={refetchBlocked}
            refetchBookings={refetchBookings}
          />
        )}


      </div>

      {/* ── Mobile fixed action buttons ─────────────────────────────────────── */}
      {/* Keluar — bottom-left, mobile only */}
      <Button
        size="sm"
        variant="outline"
        onClick={onLogout}
        className="fixed bottom-4 left-4 z-30 md:hidden flex items-center gap-1.5 rounded-full h-10 px-4 text-xs font-semibold text-red-600 border-red-200 bg-white dark:bg-card dark:border-red-800 shadow-lg hover:bg-red-50 dark:hover:bg-red-900/30"
      >
        <LogOut className="w-3.5 h-3.5" /> Keluar
      </Button>

      {/* Export Data — bottom-right, mobile only */}
      <button
        onClick={() => { setActiveTab("bookings"); setShowDownload((v) => !v); }}
        className={`fixed bottom-4 right-4 z-30 md:hidden flex items-center gap-1.5 rounded-full h-10 px-4 text-xs font-semibold border shadow-lg transition-all ${showDownload ? "bg-primary text-white border-primary" : "bg-white dark:bg-card border-border text-foreground hover:bg-muted"}`}
      >
        <Download className="w-3.5 h-3.5" /> Export Data
      </button>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          token={token}
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => {
            setShowChangePassword(false);
            onLogout();
          }}
        />
      )}
    </div>
  );
}
