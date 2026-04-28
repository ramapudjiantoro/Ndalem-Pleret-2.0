import { pgTable, text, serial, integer, timestamp, boolean, date, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── INQUIRIES (existing) ────────────────────────────────────────────────────
export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({
  id: true,
  createdAt: true,
});

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = z.infer<typeof insertInquirySchema>;

// ─── UNITS ───────────────────────────────────────────────────────────────────
export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  pricePerNight: integer("price_per_night").notNull(), // in IDR (e.g. 600000)
  maxGuests: integer("max_guests").notNull().default(6),
  bedrooms: integer("bedrooms").notNull().default(2),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertUnitSchema = createInsertSchema(units).omit({ id: true });
export type Unit = typeof units.$inferSelect;
export type InsertUnit = z.infer<typeof insertUnitSchema>;

// ─── BOOKINGS ────────────────────────────────────────────────────────────────
export const BOOKING_STATUS = ["pending", "confirmed", "cancelled"] as const;
export const PAYMENT_STATUS = ["pending", "paid"] as const;

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  bookingRef: text("booking_ref").notNull().unique(),
  unitId: integer("unit_id").notNull(),
  guestName: text("guest_name").notNull(),
  guestPhone: text("guest_phone").notNull(),
  guestEmail: text("guest_email").notNull(),
  checkIn: date("check_in").notNull(),          // YYYY-MM-DD
  checkOut: date("check_out").notNull(),         // YYYY-MM-DD
  nights: integer("nights").notNull(),
  totalPrice: integer("total_price").notNull(),  // in IDR
  status: text("status").notNull().default("pending"),       // pending | confirmed | cancelled
  paymentStatus: text("payment_status").notNull().default("pending"), // pending | paid
  guestCount: integer("guest_count").notNull().default(1),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookingSchema = z.object({
  unitId: z.number().int().positive(),
  guestName: z.string().min(2, "Nama minimal 2 karakter"),
  guestPhone: z.string().min(9, "Nomor HP tidak valid"),
  guestEmail: z.string().email("Email tidak valid"),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal salah"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal salah"),
  guestCount: z.number().int().min(1).max(20).default(1),
  notes: z.string().optional(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// ─── BLOCKED DATES ────────────────────────────────────────────────────────────
export const blockedDates = pgTable("blocked_dates", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull(),
  date: date("date").notNull(),        // YYYY-MM-DD
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBlockedDateSchema = createInsertSchema(blockedDates).omit({
  id: true,
  createdAt: true,
});

export type BlockedDate = typeof blockedDates.$inferSelect;
export type InsertBlockedDate = z.infer<typeof insertBlockedDateSchema>;
