import { google } from "googleapis";

// ─── Config ───────────────────────────────────────────────────────────────────
const CALENDAR_ID = "remopdj04@gmail.com";
const TIMEZONE    = "Asia/Jakarta"; // WIB = UTC+7

// ─── Auth ─────────────────────────────────────────────────────────────────────
function createAuth() {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn(
      "⚠️  Google Calendar: env var tidak lengkap.",
      `CLIENT_ID=${clientId ? "✓" : "✗"}`,
      `CLIENT_SECRET=${clientSecret ? "✓" : "✗"}`,
      `REFRESH_TOKEN=${refreshToken ? "✓" : "✗"}`,
    );
    return null;
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
}

// Ekstrak pesan error dari respons Google API
function extractGoogleError(err: any): string {
  const data = err?.response?.data;
  if (data) {
    // OAuth2 error: { error: "invalid_grant", error_description: "..." }
    if (typeof data.error === "string") {
      return `${data.error}${data.error_description ? ": " + data.error_description : ""}`;
    }
    // Calendar API error: { error: { code, status, message } }
    if (data.error?.message) {
      return `${data.error.code ?? ""} ${data.error.status ?? ""}: ${data.error.message}`.trim();
    }
  }
  return err?.message ?? String(err);
}

// ─── Diagnostik — dipanggil dari endpoint /api/admin/test-calendar ────────────
export async function testCalendarConnection(): Promise<{
  ok: boolean;
  envOk: boolean;
  tokenOk: boolean;
  listOk: boolean;
  details: string;
}> {
  const result = {
    ok: false,
    envOk: false,
    tokenOk: false,
    listOk: false,
    details: "",
  };

  // 1. Cek env vars
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    result.details = `Env vars tidak lengkap — CLIENT_ID:${clientId ? "✓" : "✗"} SECRET:${clientSecret ? "✓" : "✗"} REFRESH:${refreshToken ? "✓" : "✗"}`;
    return result;
  }
  result.envOk = true;

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  // 2. Coba refresh token untuk mendapat access token baru
  try {
    const { credentials } = await auth.refreshAccessToken();
    if (!credentials.access_token) throw new Error("access_token kosong setelah refresh");
    result.tokenOk = true;
  } catch (err: any) {
    result.details = `Token refresh gagal: ${extractGoogleError(err)}`;
    return result;
  }

  // 3. Coba list events dari kalender (verifikasi akses ke kalender)
  const cal = google.calendar({ version: "v3", auth });
  try {
    await cal.events.list({
      calendarId: CALENDAR_ID,
      maxResults: 1,
      singleEvents: true,
    });
    result.listOk = true;
  } catch (err: any) {
    result.details = `Tidak bisa membaca kalender '${CALENDAR_ID}': ${extractGoogleError(err)}`;
    return result;
  }

  result.ok = true;
  result.details = `Semua OK — env vars ✓, token ✓, akses kalender '${CALENDAR_ID}' ✓`;
  return result;
}

// ─── Buat Events Booking ──────────────────────────────────────────────────────
export async function createBookingCalendarEvents(data: {
  bookingRef: string;
  guestName: string;
  unitName: string;
  checkIn: string;   // YYYY-MM-DD
  checkOut: string;  // YYYY-MM-DD
  nights: number;
  guestCount: number;
  guestPhone: string;
}): Promise<void> {
  const auth = createAuth();
  if (!auth) return; // warning sudah dilog di createAuth()

  // Verifikasi token dulu sebelum insert
  try {
    await auth.refreshAccessToken();
  } catch (err: any) {
    console.error("❌ Google Calendar: token refresh gagal →", extractGoogleError(err));
    return;
  }

  const cal = google.calendar({ version: "v3", auth });
  const { bookingRef, guestName, unitName, checkIn, checkOut, nights, guestCount, guestPhone } = data;
  const desc = `📋 Kode: ${bookingRef}\n👥 ${guestCount} tamu · ${nights} malam\n📞 ${guestPhone}`;

  console.log(`📅 Google Calendar: membuat 3 event untuk ${bookingRef} ...`);

  // 1. All-day block — seluruh durasi menginap
  try {
    await cal.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `🏠 ${guestName} — ${unitName}`,
        description: desc,
        start: { date: checkIn },
        end:   { date: checkOut },   // end bersifat eksklusif di Google Cal
        colorId: "2",                 // Sage (hijau)
      },
    });
    console.log(`  ✓ Event all-day dibuat (${checkIn} → ${checkOut})`);
  } catch (err: any) {
    console.error("  ✗ Gagal buat event all-day:", extractGoogleError(err));
  }

  // 2. Check-in reminder jam 14:00 WIB
  try {
    await cal.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `🔑 Check-in: ${guestName} (${unitName})`,
        description: `${bookingRef} · ${guestCount} tamu · ${guestPhone}`,
        start: { dateTime: `${checkIn}T14:00:00+07:00`, timeZone: TIMEZONE },
        end:   { dateTime: `${checkIn}T14:15:00+07:00`, timeZone: TIMEZONE },
        colorId: "5", // Banana (kuning)
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: 60 }],
        },
      },
    });
    console.log(`  ✓ Event check-in dibuat (${checkIn} 14:00 WIB)`);
  } catch (err: any) {
    console.error("  ✗ Gagal buat event check-in:", extractGoogleError(err));
  }

  // 3. Check-out reminder jam 12:00 WIB
  try {
    await cal.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `🏃 Check-out: ${guestName} (${unitName})`,
        description: `${bookingRef} · ${guestPhone}`,
        start: { dateTime: `${checkOut}T12:00:00+07:00`, timeZone: TIMEZONE },
        end:   { dateTime: `${checkOut}T12:15:00+07:00`, timeZone: TIMEZONE },
        colorId: "6", // Tangerine (oranye)
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: 60 }],
        },
      },
    });
    console.log(`  ✓ Event check-out dibuat (${checkOut} 12:00 WIB)`);
  } catch (err: any) {
    console.error("  ✗ Gagal buat event check-out:", extractGoogleError(err));
  }
}

// ─── Hapus Events saat Pembatalan ─────────────────────────────────────────────
export async function deleteBookingCalendarEvents(bookingRef: string): Promise<void> {
  const auth = createAuth();
  if (!auth) return;

  try {
    await auth.refreshAccessToken();
  } catch (err: any) {
    console.error("❌ Google Calendar: token refresh gagal saat delete →", extractGoogleError(err));
    return;
  }

  const cal = google.calendar({ version: "v3", auth });

  try {
    const res = await cal.events.list({
      calendarId: CALENDAR_ID,
      q: bookingRef,
      maxResults: 10,
      singleEvents: true,
    });

    const events = res.data.items ?? [];
    if (events.length === 0) {
      console.log(`📅 Google Calendar: tidak ada event untuk ${bookingRef}`);
      return;
    }

    await Promise.all(
      events
        .filter((e) => e.id)
        .map((e) =>
          cal.events
            .delete({ calendarId: CALENDAR_ID, eventId: e.id! })
            .then(() => console.log(`  ✓ Event ${e.id} dihapus`))
            .catch((err) => console.error(`  ✗ Gagal hapus event ${e.id}:`, extractGoogleError(err)))
        )
    );

    console.log(`📅 Google Calendar: ${events.length} event dihapus untuk ${bookingRef}`);
  } catch (err: any) {
    console.error("❌ Google Calendar delete error:", extractGoogleError(err));
  }
}
