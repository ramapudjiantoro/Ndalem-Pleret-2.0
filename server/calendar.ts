import { google } from "googleapis";

// ─── Config ───────────────────────────────────────────────────────────────────
const CALENDAR_ID  = "remopdj04@gmail.com";
const TIMEZONE     = "Asia/Jakarta";          // WIB = UTC+7

function createAuth() {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
}

// ─── Public API ───────────────────────────────────────────────────────────────
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
  if (!auth) {
    console.warn("⚠️  Google Calendar tidak dikonfigurasi — lewati pembuatan event.");
    return;
  }

  const cal = google.calendar({ version: "v3", auth });
  const { bookingRef, guestName, unitName, checkIn, checkOut, nights, guestCount, guestPhone } = data;
  const desc = `📋 Kode: ${bookingRef}\n👥 ${guestCount} tamu · ${nights} malam\n📞 ${guestPhone}`;

  try {
    // 1. All-day event — seluruh durasi menginap
    //    Google Calendar: end date bersifat eksklusif → checkOut sudah benar
    await cal.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `🏠 ${guestName} — ${unitName}`,
        description: desc,
        start: { date: checkIn },
        end:   { date: checkOut },
        colorId: "2",  // Sage (hijau)
      },
    });

    // 2. Reminder check-in jam 14:00 WIB (15 menit)
    await cal.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `🔑 Check-in: ${guestName} (${unitName})`,
        description: `${bookingRef} · ${guestCount} tamu · ${guestPhone}`,
        start: { dateTime: `${checkIn}T14:00:00+07:00`, timeZone: TIMEZONE },
        end:   { dateTime: `${checkIn}T14:15:00+07:00`, timeZone: TIMEZONE },
        colorId: "5",  // Banana (kuning)
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: 60 }],
        },
      },
    });

    // 3. Reminder check-out jam 12:00 WIB (15 menit)
    await cal.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `🏃 Check-out: ${guestName} (${unitName})`,
        description: `${bookingRef} · ${guestPhone}`,
        start: { dateTime: `${checkOut}T12:00:00+07:00`, timeZone: TIMEZONE },
        end:   { dateTime: `${checkOut}T12:15:00+07:00`, timeZone: TIMEZONE },
        colorId: "6",  // Tangerine (oranye)
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: 60 }],
        },
      },
    });

    console.log(`📅 Google Calendar: 3 event dibuat untuk ${bookingRef}`);
  } catch (err: any) {
    // Jangan sampai gagalnya calendar merusak respons booking
    console.error("❌ Google Calendar error:", err?.message ?? err);
  }
}

// ─── Hapus semua event kalender untuk booking yang dibatalkan ─────────────────
export async function deleteBookingCalendarEvents(bookingRef: string): Promise<void> {
  const auth = createAuth();
  if (!auth) {
    console.warn("⚠️  Google Calendar tidak dikonfigurasi — lewati penghapusan event.");
    return;
  }

  const cal = google.calendar({ version: "v3", auth });

  try {
    // Cari semua event yang mengandung bookingRef di summary/description
    const res = await cal.events.list({
      calendarId: CALENDAR_ID,
      q: bookingRef,
      maxResults: 10,
      singleEvents: true,
    });

    const events = res.data.items ?? [];
    if (events.length === 0) {
      console.log(`📅 Google Calendar: tidak ada event ditemukan untuk ${bookingRef}`);
      return;
    }

    // Hapus semua event yang ditemukan
    await Promise.all(
      events
        .filter((e) => e.id)
        .map((e) =>
          cal.events.delete({ calendarId: CALENDAR_ID, eventId: e.id! }).catch((err) => {
            console.error(`❌ Gagal hapus event ${e.id}:`, err?.message ?? err);
          })
        )
    );

    console.log(`📅 Google Calendar: ${events.length} event dihapus untuk ${bookingRef}`);
  } catch (err: any) {
    console.error("❌ Google Calendar delete error:", err?.message ?? err);
  }
}
