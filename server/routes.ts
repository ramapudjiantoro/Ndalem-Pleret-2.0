import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertBookingSchema, insertInquirySchema } from "@shared/schema";
import { sendBookingReceived, sendBookingConfirmation, verifyEmailConfig } from "./email";
import { createBookingCalendarEvents, deleteBookingCalendarEvents } from "./calendar";
import { z } from "zod";

// ─── Simple admin auth middleware ─────────────────────────────────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ndalem2025";

function adminAuth(req: any, res: any, next: any) {
  const token = req.headers["x-admin-token"] as string | undefined;
  if (!token || token !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
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

      // Calculate total
      const totalPrice = unit.pricePerNight * nights;

      // Create booking
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
      });

      res.status(201).json(booking);

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
    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ message: "Password salah" });
    }
    res.json({ token: ADMIN_PASSWORD });
  });

  // ── Admin: List Bookings ───────────────────────────────────────────────────
  app.get("/api/admin/bookings", adminAuth, async (_req, res) => {
    const allBookings = await storage.listBookings();
    res.json(allBookings);
  });

  // ── Admin: Update Booking ──────────────────────────────────────────────────
  app.patch("/api/admin/bookings/:id", adminAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { status, paymentStatus, adminNotes } = req.body as { status?: string; paymentStatus?: string; adminNotes?: string };

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

  return httpServer;
}
