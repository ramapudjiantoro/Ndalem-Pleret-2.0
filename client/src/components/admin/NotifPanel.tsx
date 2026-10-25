import { X, Bell } from "lucide-react";
import { AdminNotif, NOTIF_ICON } from "./useAdminNotifications";

// ─── NotifPanel ───────────────────────────────────────────────────────────────
export function NotifPanel({
  notifs, unread, permission,
  onRequestPermission, onMarkAllRead, onClearAll, onClose,
}: {
  notifs: AdminNotif[]; unread: number; permission: NotificationPermission;
  onRequestPermission: () => void; onMarkAllRead: () => void; onClearAll: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed left-2 right-2 top-[62px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white dark:bg-card border border-border/50 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[calc(100vh-80px)] overflow-y-auto sm:max-h-none sm:overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-primary/5">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm">Notifikasi</span>
          {unread > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button onClick={onMarkAllRead} className="text-xs text-primary hover:underline">Semua dibaca</button>
          )}
          {notifs.length > 0 && (
            <button onClick={onClearAll} className="text-xs text-muted-foreground hover:text-foreground">Hapus</button>
          )}
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Permission banner */}
      {permission !== "granted" && (
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700/30">
          <p className="text-xs text-amber-800 dark:text-amber-300 mb-2 leading-snug">
            {permission === "denied"
              ? "⚠️ Notifikasi browser diblokir. Izinkan di pengaturan browser Anda."
              : "Aktifkan notifikasi browser agar alert muncul meski tab diminimalkan."}
          </p>
          {permission !== "denied" && (
            <button onClick={onRequestPermission}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-3 py-1.5 font-medium transition-colors">
              Aktifkan Notifikasi Browser
            </button>
          )}
        </div>
      )}

      {/* List */}
      <div className="max-h-64 overflow-y-auto">
        {notifs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p>Belum ada notifikasi</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {notifs.map((n) => (
              <div key={n.id} className={`px-4 py-3 flex items-start gap-3 transition-colors ${!n.read ? "bg-primary/[0.03]" : ""}`}>
                <span className="text-base leading-none mt-0.5 shrink-0">{NOTIF_ICON[n.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold leading-snug ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                    {n.title.replace(" (Simulasi)", "")}
                    {n.title.includes("Simulasi") && (
                      <span className="ml-1 text-[9px] bg-muted px-1 rounded font-normal">simulasi</span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1">
                    {n.at.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {!n.read && <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
