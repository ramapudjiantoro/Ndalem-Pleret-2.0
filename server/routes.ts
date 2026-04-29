import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertBookingSchema, insertInquirySchema } from "@shared/schema";
import { sendBookingReceived, sendBookingConfirmation, verifyEmailConfig } from "./email";
import { createBookingCalendarEvents, deleteBookingCalendarEvents } from "./calendar";
import { sendPushToAll, initPush, isPushReady, getPublicKey } from "./push";
import {
  isMidtransEnabled, chargeQris, fetchQrisImageBuffer, verifyWebhookSignature
} from "./midtrans";
import { z } from "zod";

// ─── Constants ────────────────────────────────────────────────────────────────
const DEPOSIT = 500_000; // Rp 500.000 — deposit jaminan, sama di FE dan BE

// ─── Simple admin auth middleware ─────────────────────────────────────────────
const ADMIN_PASSWORD_ENV = process.env.ADMIN_PASSWORD || "ndalem2025";

async function adminAuth(req: any, res: any, next: any) {
  const token = req.headers["x-admin-token"] as string | undefined;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const activePassword = await storage.getAdminPassword();
    if (token !== activePassword) return res.status(401).json({ message: "Unauthorized" });
    next();
  } catch {
    res.status(500).json({ message: "Auth error" });
  }
}

// ─── Night calculation helper ─────────────────────────────────────────────────
function calcNights(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // Seed default units on startup
  await storage.seedUnitsIfEmpty();

  // Init Web Push dengan VAPID keys dari DB (jika sudah di-setup)
  storage.getVapidKeys().then((keys) => {
    if (keys) initPush(keys);
    else console.log("ℹ️  VAPID keys not set — configure via Admin Dashboard → Settings");
  }).catch(() => {});

  // ── Public: Inquiries ──────────────────────────────────────────────────────
  app.post("/api/inquiries", async (req, res) => {
    try {
      const input = insertInquirySchema.parse(req.body);
      const inquiry = await storage.createInquiry(input);
      res.status(201).json(inquiry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  // ── Public: Units ──────────────────────────────────────────────────────────
  app.get("/api/units", async (_req, res) => {
    const unitList = await storage.listUnits();
    res.json(unitList);
  });

  // ── Public: Availability ───────────────────────────────────────────────────
  app.get("/api/availability", async (req, res) => {
    try {
      const { unitId, start, end } = req.query as Record<string, string>;
      if (!unitId || !start || !end) {
        return res.status(400).json({ message: "unitId, start, and end are required" });
      }

      const uid = parseInt(unitId, 10);
      const booked = await storage.getBookedDates(uid, start, end);
      const blocked = await storage.getBlockedDates(uid);
      const blockedDateStrings = blocked.map((b) => b.date);

      const unavailable = Array.from(new Set([...booked, ...blockedDateStrings]));
      res.json({ unitId: uid, unavailableDates: unavailable });
    } catch (err) {
      throw err;
    }
  });

  // ── Public: Create Booking ─────────────────────────────────────────────────
  app.post("/api/bookings", async (req, res) => {
    try {
      const input = insertBookingSchema.parse(req.body);
      const { unitId, checkIn, checkOut, guestCount, guestName, guestPhone, guestEmail, notes } = input;

      // Validate unit exists
      const unit = await storage.getUnit(unitId);
      if (!unit) {
        return res.status(404).json({ message: "Unit tidak ditemukan" });
      }

      // Validate dates
      const nights = calcNights(checkIn, checkOut);
      if (nights < 1) {
        return res.status(400).json({ message: "Tanggal check-out harus setelah check-in" });
      }

      // Check availability
      const available = await storage.isDateRangeAvailable(unitId, checkIn, checkOut);
      if (!available) {
        return res.status(409).json({ message: "Maaf, tanggal yang Anda pilih sudah dipesan. Silakan pilih tanggal lain." });
      }

      // Calculate total (deposit tidak masuk totalPrice DB, dihitung saat pembayaran)
      const totalPrice = unit.pricePerNight * nights;

      // ── Unique amount: totalPrice + deposit + suffix unik 1-999 ──────────────
      // Suffix memungkinkan admin memverifikasi pembayaran dari mutasi rekening.
      // Jika Midtrans aktif, uniqueAmount juga menjadi gross_amount ke Midtrans.
      const uniqueSuffix = Math.floor(Math.random() * 999) + 1;
      const uniqueAmount = totalPrice + DEPOSIT + uniqueSuffix;

      // Create booking (Midtrans fields diisi setelah charge, lewat update terpisah)
      const booking = await storage.createBooking({
        unitId,
        guestName,
        guestPhone,
        guestEmail,
        checkIn,
        checkOut,
        nights,
        totalPrice,
        guestCount: guestCount ?? 1,
        notes,
        uniqueAmount,
      });

      // ── Try Midtrans dynamic QRIS (opsional, fallback ke static QRIS jika gagal) ─
      let midtransTransactionId: string | null = null;
      let qrisExpiry: string | null = null;

      if (isMidtransEnabled()) {
        try {
          const midtrans = await chargeQris(booking.bookingRef, uniqueAmount);
          midtransTransactionId = midtrans.transactionId;
          qrisExpiry = midtrans.expiryTime;
          await storage.updateMidtransInfo(booking.id, midtrans.transactionId, midtrans.expiryTime);
          console.log(`✅ Midtrans QRIS created for ${booking.bookingRef}: ${midtrans.transactionId}`);
        } catch (err) {
          console.error(`⚠️  Midtrans charge failed for ${booking.bookingRef}, fallback to static QRIS:`, err);
          // Tidak throw — booking tetap berhasil, customer bayar via static QRIS
        }
      }

      // Sertakan Midtrans fields dalam response agar frontend bisa tampilkan QR yang benar
      res.status(201).json({ ...booking, midtransTransactionId, qrisExpiry });

      // Email 1: kirim notif "pesanan diterima + instruksi bayar" — BUKAN konfirmasi final
      sendBookingReceived({
        guestEmail: booking.guestEmail,
        bookingRef: booking.bookingRef,
        guestName: booking.guestName,
        unitName: unit.name,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: booking.nights,
        totalPrice: booking.totalPrice,
        guestCount: booking.guestCount,
      }).catch((err) => console.error("❌ Receipt email failed:", err?.message ?? err));

      // Web Push: kirim notifikasi ke semua browser admin yang sudah subscribe
      storage.getPushSubscriptions().then(async (subs) => {
        if (subs.length === 0) return;
        const expired = await sendPushToAll(subs, {
          title: "🔔 Pesanan Baru!",
          body: `${booking.guestName} memesan ${unit.name} · ${booking.checkIn} → ${booking.checkOut} · ${booking.nights} malam`,
          tag: booking.bookingRef,
          requireInteraction: true,
          url: "/admin",
        });
        // Hapus subscription yang sudah expired (user unsubscribed dari browser)
        if (expired.length > 0) storage.deletePushSubscriptions(expired).catch(() => {});
      }).catch((err) => console.error("Push notification failed:", err));

      // Fire-and-forget — buat 3 Google Calendar events
      createBookingCalendarEvents({
        bookingRef: booking.bookingRef,
        guestName: booking.guestName,
        unitName: unit.name,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: booking.nights,
        guestCount: booking.guestCount,
        guestPhone: booking.guestPhone,
      }).catch((err) => console.error("Google Calendar failed:", err));

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  // ── Public: Get Booking by Ref ─────────────────────────────────────────────
  app.get("/api/bookings/:ref", async (req, res) => {
    const booking = await storage.getBookingByRef(req.params.ref);
    if (!booking) {
      return res.status(404).json({ message: "Booking tidak ditemukan" });
    }

    // Also fetch unit name
    const unit = await storage.getUnit(booking.unitId);
    res.json({ ...booking, unitName: unit?.name ?? "Unknown Unit" });
  });

  // ── Public: QRIS Image Proxy ───────────────────────────────────────────────
  // Midtrans QR image memerlukan auth header — tidak bisa di-load langsung dari browser.
  // Endpoint ini fetch dari Midtrans server-side lalu pipe ke client.
  app.get("/api/bookings/:ref/qris-image", async (req, res) => {
    try {
      const booking = await storage.getBookingByRef(req.params.ref);
      if (!booking?.midtransTransactionId) {
        return res.status(404).json({ message: "No dynamic QRIS for this booking" });
      }

      const { buffer, contentType } = await fetchQrisImageBuffer(booking.midtransTransactionId);
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=3600"); // QR boleh di-cache 1 jam
      res.send(buffer);
    } catch (err) {
      console.error("QRIS image proxy error:", err);
      res.status(502).json({ message: "Gagal mengambil gambar QRIS" });
    }
  });

  // ── Public: Midtrans Payment Webhook ──────────────────────────────────────
  // Midtrans memanggil endpoint ini saat pembayaran berhasil/gagal.
  // Pastikan URL ini didaftarkan di Midtrans Dashboard → Settings → Payment Notification URL:
  //   https://ndalempleret.com/api/midtrans-webhook
  app.post("/api/midtrans-webhook", async (req, res) => {
    try {
      const {
        order_id,
        status_code,
        gross_amount,
        transaction_status,
        signature_key,
        fraud_status,
      } = req.body as Record<string, string>;

      // Verify signature — tolak request palsu
      if (!verifyWebhookSignature(order_id, status_code, gross_amount, signature_key)) {
        console.warn(`⚠️  Midtrans webhook signature mismatch for order ${order_id}`);
        return res.status(403).json({ message: "Invalid signature" });
      }

      // Hanya proses "settlement" (lunas) atau "capture" (kartu kredit, tapi kita tidak pakai)
      // "pending" = belum bayar, "deny"/"cancel"/"expire" = gagal
      const isSettled =
        transaction_status === "settlement" ||
        (transaction_status === "capture" && fraud_status === "accept");

      if (isSettled) {
        const booking = await storage.getBookingByRef(order_id);
        if (booking && booking.paymentStatus !== "paid") {
          await storage.updatePaymentStatusByRef(order_id, "paid");
          console.log(`✅ Midtrans payment confirmed for ${order_id}`);

          // Kirim email konfirmasi ke tamu
          const unit = await storage.getUnit(booking.unitId);
          sendBookingConfirmation({
            guestEmail: booking.guestEmail,
            bookingRef: booking.bookingRef,
            guestName: booking.guestName,
            unitName: unit?.name ?? "Ndalem Pleret",
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            nights: booking.nights,
            totalPrice: booking.totalPrice,
            guestCount: booking.guestCount,
          }).catch((err) => console.error("Confirmation email failed:", err));

          // Auto-confirm booking status juga
          await storage.updateBookingStatus(booking.id, "confirmed");
        }
      }

      // Midtrans expects HTTP 200 regardless of our processing result
      res.status(200).json({ message: "OK" });
    } catch (err) {
      console.error("Midtrans webhook error:", err);
      // Tetap 200 agar Midtrans tidak retry berulang-ulang
      res.status(200).json({ message: "OK" });
    }
  });

  // ── Admin: Test Email ──────────────────────────────────────────────────────
  app.post("/api/admin/test-email", adminAuth, async (req, res) => {
    const { to } = req.body as { to?: string };
    if (!to) return res.status(400).json({ message: "Field 'to' (email tujuan) diperlukan" });
    try {
      await verifyEmailConfig();
      await sendBookingReceived({
        guestEmail: to,
        bookingRef: "NP-TEST-0000",
        guestName: "Test Tamu",
        unitName: "Ndalem Belakang (TEST)",
        checkIn: new Date().toISOString().slice(0, 10),
        checkOut: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
        nights: 2,
        totalPrice: 1200000,
        guestCount: 4,
      });
      res.json({ ok: true, message: `Test email sent to ${to}` });
    } catch (err: any) {
      console.error("❌ Test email failed:", err?.message ?? err);
      res.status(500).json({ ok: false, message: err?.message ?? "Unknown error" });
    }
  });

  // ── Admin: Login ───────────────────────────────────────────────────────────
  app.post("/api/admin/login", async (req, res) => {
    const { password } = req.body as { password?: string };
    if (!password) return res.status(400).json({ message: "Password diperlukan" });
    const activePassword = await storage.getAdminPassword();
    if (password !== activePassword) {
      return res.status(401).json({ message: "Password salah" });
    }
    res.json({ token: activePassword });
  });

  // ── Admin: Reset Password (lupa password — pakai master key dari env) ──────
  app.post("/api/admin/reset-password", async (req, res) => {
    const { masterKey, newPassword } = req.body as { masterKey?: string; newPassword?: string };
    if (!masterKey || !newPassword) {
      return res.status(400).json({ message: "masterKey dan newPassword diperlukan" });
    }
    // Master key SELALU env var ADMIN_PASSWORD — tidak bisa diubah lewat DB
    if (masterKey !== ADMIN_PASSWORD_ENV) {
      return res.status(401).json({ message: "Master key salah" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password baru minimal 6 karakter" });
    }
    await storage.setAdminPassword(newPassword);
    res.json({ ok: true, token: newPassword });
  });

  // ── Admin: Change Password (sudah login, tahu password lama) ──────────────
  app.post("/api/admin/change-password", adminAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "currentPassword dan newPassword diperlukan" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password baru minimal 6 karakter" });
    }
    const activePassword = await storage.getAdminPassword();
    if (currentPassword !== activePassword) {
      return res.status(401).json({ message: "Password saat ini salah" });
    }
    await storage.setAdminPassword(newPassword);
    res.json({ ok: true });
  });

  // ── Admin: List Bookings ───────────────────────────────────────────────────
  app.get("/api/admin/bookings", adminAuth, async (_req, res) => {
    const allBookings = await storage.listBookings();
    res.json(allBookings);
  });

  // ── Admin: Check Date Availability (for editing) ──────────────────────────
  app.get("/api/admin/bookings/:id/check-dates", adminAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { checkIn, checkOut } = req.query as { checkIn?: string; checkOut?: string };

    if (!checkIn || !checkOut) {
      return res.status(400).json({ message: "checkIn dan checkOut diperlukan" });
    }

    const nights = calcNights(checkIn, checkOut);
    if (nights < 1) {
      return res.status(400).json({ message: "checkOut harus setelah checkIn", available: false });
    }

    const booking = await storage.getBookingById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking tidak ditemukan" });
    }

    const available = await storage.isDateRangeAvailableExcluding(booking.unitId, checkIn, checkOut, id);
    res.json({ available, nights });
  });

  // ── Admin: Update Booking ──────────────────────────────────────────────────
  app.patch("/api/admin/bookings/:id", adminAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { status, paymentStatus, adminNotes, checkIn, checkOut } = req.body as {
      status?: string; paymentStatus?: string; adminNotes?: string;
      checkIn?: string; checkOut?: string;
    };

    let updated;
    if (status) {
      updated = await storage.updateBookingStatus(id, status);
    }
    if (paymentStatus) {
      updated = await storage.updatePaymentStatus(id, paymentStatus);
    }
    if (adminNotes !== undefined) {
      updated = await storage.updateAdminNotes(id, adminNotes);
    }
    if (checkIn && checkOut) {
      const nights = calcNights(checkIn, checkOut);
      if (nights < 1) {
        return res.status(400).json({ message: "checkOut harus setelah checkIn" });
      }
      const booking = await storage.getBookingById(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking tidak ditemukan" });
      }
      // Validate availability (excluding this booking itself)
      const available = await storage.isDateRangeAvailableExcluding(booking.unitId, checkIn, checkOut, id);
      if (!available) {
        return res.status(409).json({ message: "Tanggal bentrok dengan booking atau pemblokiran lain" });
      }
      const unit = await storage.getUnit(booking.unitId);
      const totalPrice = (unit?.pricePerNight ?? booking.totalPrice / booking.nights) * nights;
      updated = await storage.updateBookingDates(id, checkIn, checkOut, nights, Math.round(totalPrice));
    }
    if (!updated) {
      return res.status(404).json({ message: "Booking tidak ditemukan" });
    }

    res.json(updated);

    // Email 2: kirim konfirmasi final HANYA saat admin mengubah status → "confirmed"
    if (status === "confirmed") {
      const unit = await storage.getUnit(updated.unitId);
      sendBookingConfirmation({
        guestEmail: updated.guestEmail,
        bookingRef: updated.bookingRef,
        guestName: updated.guestName,
        unitName: unit?.name ?? "Ndalem Pleret",
        checkIn: updated.checkIn,
        checkOut: updated.checkOut,
        nights: updated.nights,
        totalPrice: updated.totalPrice,
        guestCount: updated.guestCount,
      }).catch((err) => console.error("❌ Confirmation email failed:", err?.message ?? err));
    }

    // Google Calendar: hapus semua event jika booking dibatalkan
    if (status === "cancelled") {
      deleteBookingCalendarEvents(updated.bookingRef)
        .catch((err) => console.error("Calendar delete failed:", err));
    }
  });

  // ── Admin: Delete Booking ─────────────────────────────────────────────────
  app.delete("/api/admin/bookings/:id", adminAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const deleted = await storage.deleteBooking(id);
    if (!deleted) {
      return res.status(404).json({ message: "Booking tidak ditemukan" });
    }

    res.status(204).send();

    // Hapus Google Calendar events terkait booking ini
    deleteBookingCalendarEvents(deleted.bookingRef)
      .catch((err) => console.error("Calendar delete on booking-delete failed:", err));
  });

  // ── Admin: Blocked Dates ───────────────────────────────────────────────────
  app.get("/api/admin/blocked-dates", adminAuth, async (_req, res) => {
    const blocked = await storage.getBlockedDates();
    res.json(blocked);
  });

  app.post("/api/admin/blocked-dates", adminAuth, async (req, res) => {
    const { unitId, date, reason } = req.body as { unitId: number; date: string; reason?: string };
    if (!unitId || !date) {
      return res.status(400).json({ message: "unitId dan date diperlukan" });
    }
    const blocked = await storage.blockDate(unitId, date, reason);
    res.status(201).json(blocked);
  });

  app.delete("/api/admin/blocked-dates/:id", adminAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await storage.deleteBlockedDate(id);
    res.status(204).send();
  });

  // ── Admin: Web Push ────────────────────────────────────────────────────────
  // Kirim VAPID public key ke frontend untuk subscribe
  app.get("/api/admin/vapid-public-key", adminAuth, (_req, res) => {
    res.json({ publicKey: getPublicKey(), ready: isPushReady() });
  });

  // Setup VAPID keys dari Admin Dashboard (simpan ke DB, langsung init)
  app.post("/api/admin/vapid-setup", adminAuth, async (req, res) => {
    const { publicKey, privateKey, email } = req.body as {
      publicKey?: string; privateKey?: string; email?: string;
    };
    if (!publicKey || !privateKey) {
      return res.status(400).json({ message: "publicKey dan privateKey diperlukan" });
    }
    const vapidEmail = email ?? "cs@ndalempleret.com";
    await storage.setVapidKeys(publicKey, privateKey, vapidEmail);
    initPush({ publicKey, privateKey, email: vapidEmail }); // aktifkan langsung tanpa restart
    res.json({ ok: true, message: "VAPID keys saved and push initialized" });
  });

  // Simpan push subscription baru dari browser admin
  app.post("/api/admin/push-subscribe", adminAuth, async (req, res) => {
    const { endpoint, keys } = req.body as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: "endpoint dan keys (p256dh, auth) diperlukan" });
    }
    await storage.savePushSubscription({ endpoint, p256dh: keys.p256dh, auth: keys.auth });
    res.json({ ok: true });
  });

  // Hapus push subscription (user mematikan notifikasi)
  app.delete("/api/admin/push-unsubscribe", adminAuth, async (req, res) => {
    const { endpoint } = req.body as { endpoint?: string };
    if (!endpoint) return res.status(400).json({ message: "endpoint diperlukan" });
    await storage.deletePushSubscription(endpoint);
    res.json({ ok: true });
  });

  return httpServer;
}
