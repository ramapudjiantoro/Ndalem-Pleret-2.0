import { db as rawDb } from "./db";
import { eq, and, gt, lt, ne } from "drizzle-orm";

// Guard: throw a friendly error if DATABASE_URL was never set
function requireDb() {
  if (!rawDb) {
    throw Object.assign(
      new Error("Database not configured. Add DATABASE_URL to your .env file."),
      { status: 503 }
    );
  }
  return rawDb;
}

const db = new Proxy({} as NonNullable<typeof rawDb>, {
  get(_target, prop) {
    const database = requireDb();
    return (database as any)[prop];
  },
});
import {
  inquiries, units, bookings, blockedDates,
  type InsertInquiry, type Inquiry,
  type Unit,
  type Booking,
  type BlockedDate,
} from "@shared/schema";

// ─── HELPER: normalise a DB date value to "YYYY-MM-DD" string ─────────────────
// Drizzle with node-postgres may return `date` columns as a plain string
// OR as a JavaScript Date object (midnight UTC or midnight local, depending on
// driver version). This helper handles both cases safely.
function toDateStr(val: unknown): string {
  if (typeof val === "string") return val.slice(0, 10);
  if (val instanceof Date) {
    // Use UTC components to avoid timezone shift
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, "0");
    const d = String(val.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(val).slice(0, 10);
}

// ─── HELPER: generate booking reference ──────────────────────────────────────
function generateBookingRef(): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `NP-${ymd}-${rand}`;
}

// ─── INTERFACE ────────────────────────────────────────────────────────────────
export interface IStorage {
  // Inquiries
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;

  // Units
  listUnits(): Promise<Unit[]>;
  getUnit(id: number): Promise<Unit | undefined>;
  seedUnitsIfEmpty(): Promise<void>;

  // Availability
  getBookedDates(unitId: number, start: string, end: string): Promise<string[]>;
  getBlockedDates(unitId?: number): Promise<BlockedDate[]>;
  isDateRangeAvailable(unitId: number, checkIn: string, checkOut: string): Promise<boolean>;

  // Bookings
  createBooking(data: {
    unitId: number;
    guestName: string;
    guestPhone: string;
    guestEmail: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    totalPrice: number;
    guestCount: number;
    notes?: string;
  }): Promise<Booking>;
  getBookingByRef(ref: string): Promise<Booking | undefined>;
  listBookings(): Promise<(Booking & { unitName: string })[]>;
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;
  updatePaymentStatus(id: number, paymentStatus: string): Promise<Booking | undefined>;
  deleteBooking(id: number): Promise<{ bookingRef: string } | undefined>;

  // Blocked Dates
  blockDate(unitId: number, date: string, reason?: string): Promise<BlockedDate>;
  deleteBlockedDate(id: number): Promise<void>;
}

// ─── IMPLEMENTATION ───────────────────────────────────────────────────────────
export class DatabaseStorage implements IStorage {

  // ── Inquiries ──────────────────────────────────────────────────────────────
  async createInquiry(insertInquiry: InsertInquiry): Promise<Inquiry> {
    const [inquiry] = await db.insert(inquiries).values(insertInquiry).returning();
    return inquiry;
  }

  // ── Units ──────────────────────────────────────────────────────────────────
  async listUnits(): Promise<Unit[]> {
    return db.select().from(units).where(eq(units.isActive, true));
  }

  async getUnit(id: number): Promise<Unit | undefined> {
    const [unit] = await db.select().from(units).where(eq(units.id, id));
    return unit;
  }

  async seedUnitsIfEmpty(): Promise<void> {
    const existing = await db.select().from(units);

    if (existing.length === 0) {
      await db.insert(units).values([
        {
          name: "Ndalem Belakang",
          slug: "unit-a",
          description: "Rumah utuh dengan 2 kamar tidur, ruang keluarga luas, dapur lengkap, dan taman pribadi. Ideal untuk keluarga 4–6 orang.",
          pricePerNight: 600000,
          maxGuests: 6,
          bedrooms: 2,
          isActive: true,
        },
        {
          name: "Ndalem Tengah",
          slug: "unit-b",
          description: "Rumah kedua dengan nuansa yang hangat, 2 kamar tidur, area parkir luas, dan fasilitas modern yang lengkap.",
          pricePerNight: 600000,
          maxGuests: 6,
          bedrooms: 2,
          isActive: true,
        },
      ]);
      return;
    }

    // Rename units if they still use the old names
    const renames: Record<string, string> = {
      "Unit A — Ndalem Pleret": "Ndalem Belakang",
      "Unit B — Ndalem Pleret": "Ndalem Tengah",
    };
    for (const unit of existing) {
      if (renames[unit.name]) {
        await db.update(units).set({ name: renames[unit.name] }).where(eq(units.id, unit.id));
      }
    }
  }

  // ── Availability ───────────────────────────────────────────────────────────
  async getBookedDates(unitId: number, start: string, end: string): Promise<string[]> {
    const rows = await db
      .select({ checkIn: bookings.checkIn, checkOut: bookings.checkOut })
      .from(bookings)
      .where(
        and(
          eq(bookings.unitId, unitId),
          ne(bookings.status, "cancelled"),
          lt(bookings.checkIn, end),   // existing starts before window ends
          gt(bookings.checkOut, start), // existing ends after window starts
        )
      );

    const dates = new Set<string>();
    for (const row of rows) {
      // Drizzle may return `date` columns as string OR Date depending on driver version.
      // Normalise to "YYYY-MM-DD" string safely either way.
      let cur = toDateStr(row.checkIn);
      const last = toDateStr(row.checkOut);
      while (cur < last) {
        dates.add(cur);
        // Advance by 1 day using UTC noon to dodge DST/timezone shifts
        const d = new Date(cur + "T12:00:00Z");
        d.setUTCDate(d.getUTCDate() + 1);
        cur = d.toISOString().slice(0, 10);
      }
      // Note: checkOut date itself is NOT added — it's available for a new check-in
    }
    return Array.from(dates);
  }

  async getBlockedDates(unitId?: number): Promise<BlockedDate[]> {
    if (unitId !== undefined) {
      return db.select().from(blockedDates).where(eq(blockedDates.unitId, unitId));
    }
    return db.select().from(blockedDates);
  }

  async isDateRangeAvailable(unitId: number, checkIn: string, checkOut: string): Promise<boolean> {
    // Two bookings [A,B) and [C,D) overlap iff A < D AND C < B (strict)
    // This means a guest can check in on the same day another checks out.
    const conflictBookings = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.unitId, unitId),
          ne(bookings.status, "cancelled"),
          lt(bookings.checkIn, checkOut),  // existing.checkIn < new.checkOut
          gt(bookings.checkOut, checkIn),  // existing.checkOut > new.checkIn
        )
      );
    if (conflictBookings.length > 0) return false;

    // Check blocked dates — iterate using timezone-safe string logic
    let cur = checkIn;
    while (cur < checkOut) {
      const blocked = await db
        .select({ id: blockedDates.id })
        .from(blockedDates)
        .where(
          and(
            eq(blockedDates.unitId, unitId),
            eq(blockedDates.date, cur)
          )
        );
      if (blocked.length > 0) return false;
      const d = new Date(cur + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + 1);
      cur = d.toISOString().slice(0, 10);
    }
    return true;
  }

  // ── Bookings ───────────────────────────────────────────────────────────────
  async createBooking(data: {
    unitId: number;
    guestName: string;
    guestPhone: string;
    guestEmail: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    totalPrice: number;
    guestCount: number;
    notes?: string;
  }): Promise<Booking> {
    const bookingRef = generateBookingRef();
    const [booking] = await db
      .insert(bookings)
      .values({
        ...data,
        bookingRef,
        status: "pending",
        paymentStatus: "pending",
      })
      .returning();
    return booking;
  }

  async getBookingByRef(ref: string): Promise<Booking | undefined> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.bookingRef, ref));
    return booking;
  }

  async listBookings(): Promise<(Booking & { unitName: string })[]> {
    const rows = await db
      .select({
        id: bookings.id,
        bookingRef: bookings.bookingRef,
        unitId: bookings.unitId,
        guestName: bookings.guestName,
        guestPhone: bookings.guestPhone,
        guestEmail: bookings.guestEmail,
        checkIn: bookings.checkIn,
        checkOut: bookings.checkOut,
        nights: bookings.nights,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        paymentStatus: bookings.paymentStatus,
        guestCount: bookings.guestCount,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        unitName: units.name,
      })
      .from(bookings)
      .leftJoin(units, eq(bookings.unitId, units.id))
      .orderBy(bookings.createdAt);

    return rows.map((r) => ({
      ...r,
      unitName: r.unitName ?? "Unknown Unit",
    }));
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    const [updated] = await db
      .update(bookings)
      .set({ status })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async updatePaymentStatus(id: number, paymentStatus: string): Promise<Booking | undefined> {
    const [updated] = await db
      .update(bookings)
      .set({ paymentStatus })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async deleteBooking(id: number): Promise<{ bookingRef: string } | undefined> {
    const [deleted] = await db
      .delete(bookings)
      .where(eq(bookings.id, id))
      .returning({ bookingRef: bookings.bookingRef });
    return deleted;
  }

  // ── Blocked Dates ──────────────────────────────────────────────────────────
  async blockDate(unitId: number, date: string, reason?: string): Promise<BlockedDate> {
    const [blocked] = await db
      .insert(blockedDates)
      .values({ unitId, date, reason: reason ?? null })
      .returning();
    return blocked;
  }

  async deleteBlockedDate(id: number): Promise<void> {
    await db.delete(blockedDates).where(eq(blockedDates.id, id));
  }
}

export const storage = new DatabaseStorage();
