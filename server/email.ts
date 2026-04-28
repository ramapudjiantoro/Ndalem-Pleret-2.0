import { Resend } from "resend";

// ─── Config ───────────────────────────────────────────────────────────────────
// Resend uses HTTPS (port 443) — tidak diblokir Railway seperti SMTP (587/465)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = "Ndalem Pleret <cs@ndalempleret.com>";

console.log(`📧 Email config: RESEND_API_KEY=${RESEND_API_KEY ? "set" : "NOT SET ❌"}`);

function getResend(): Resend | null {
  if (!RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY not set — email will not be sent.");
    return null;
  }
  return new Resend(RESEND_API_KEY);
}

// ─── Startup check ────────────────────────────────────────────────────────────
export async function verifyEmailConfig(): Promise<void> {
  if (!RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY not set — add it to Railway Variables.");
    return;
  }
  console.log("✅ Resend API key is set — email ready.");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Template 1: Pesanan Diterima (dikirim saat booking dibuat, status pending) ─
function buildReceiptHtml(data: {
  bookingRef: string;
  guestName: string;
  unitName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  guestCount: number;
}): string {
  const { bookingRef, guestName, unitName, checkIn, checkOut, nights, totalPrice, guestCount } = data;
  const deposit = 500000;
  const grandTotal = totalPrice + deposit;
  const waText = encodeURIComponent(`Halo Ndalem Pleret, saya ingin mengirimkan bukti pembayaran untuk pemesanan ${bookingRef} atas nama ${guestName}.`);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pesanan Diterima — Ndalem Pleret</title>
</head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- Header -->
        <tr><td style="background:#7c5c3e;border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Ndalem Pleret</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;letter-spacing:1px;text-transform:uppercase;">Guest House & Residences · Solo</p>
        </td></tr>

        <!-- Amber pending bar -->
        <tr><td style="background:#b45309;padding:16px 40px;text-align:center;">
          <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">📋 &nbsp;Pesanan Anda Telah Kami Terima</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:40px;">

          <p style="margin:0 0 8px;color:#555;font-size:14px;">Halo, <strong style="color:#1a1a1a;">${guestName}</strong>!</p>
          <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.7;">
            Terima kasih telah memilih Ndalem Pleret. Pesanan Anda telah kami catat dan sedang menunggu verifikasi pembayaran.
            Segera selesaikan pembayaran agar tempat Anda dapat kami konfirmasi.
          </p>

          <!-- Pending notice -->
          <div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:28px;">
            <p style="margin:0;font-size:13px;color:#92400e;font-weight:600;">⏳ Menunggu Pembayaran</p>
            <p style="margin:6px 0 0;font-size:13px;color:#78350f;line-height:1.6;">
              Booking Anda <strong>belum final</strong> sampai pembayaran diverifikasi oleh tim kami.
            </p>
          </div>

          <!-- Booking ref badge -->
          <div style="background:#fdf6ee;border:2px dashed #c8956a;border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;">
            <p style="margin:0 0 4px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Kode Pesanan Anda</p>
            <p style="margin:0;color:#7c5c3e;font-size:28px;font-weight:800;font-family:monospace;letter-spacing:2px;">${bookingRef}</p>
            <p style="margin:6px 0 0;color:#aaa;font-size:11px;">Sertakan kode ini saat mengirim bukti pembayaran</p>
          </div>

          <!-- Detail table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:12px;overflow:hidden;margin-bottom:28px;">
            <tr style="background:#f9f6f2;">
              <td colspan="2" style="padding:14px 20px;font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Detail Pesanan</td>
            </tr>
            <tr style="border-top:1px solid #eee;">
              <td style="padding:14px 20px;font-size:13px;color:#888;width:45%;">Unit</td>
              <td style="padding:14px 20px;font-size:13px;color:#1a1a1a;font-weight:600;">${unitName}</td>
            </tr>
            <tr style="border-top:1px solid #eee;background:#fafafa;">
              <td style="padding:14px 20px;font-size:13px;color:#888;">Check-in</td>
              <td style="padding:14px 20px;font-size:13px;color:#1a1a1a;font-weight:600;">${formatDate(checkIn)}</td>
            </tr>
            <tr style="border-top:1px solid #eee;">
              <td style="padding:14px 20px;font-size:13px;color:#888;">Check-out</td>
              <td style="padding:14px 20px;font-size:13px;color:#1a1a1a;font-weight:600;">${formatDate(checkOut)}</td>
            </tr>
            <tr style="border-top:1px solid #eee;background:#fafafa;">
              <td style="padding:14px 20px;font-size:13px;color:#888;">Durasi</td>
              <td style="padding:14px 20px;font-size:13px;color:#1a1a1a;font-weight:600;">${nights} malam</td>
            </tr>
            <tr style="border-top:1px solid #eee;">
              <td style="padding:14px 20px;font-size:13px;color:#888;">Jumlah Tamu</td>
              <td style="padding:14px 20px;font-size:13px;color:#1a1a1a;font-weight:600;">${guestCount} orang</td>
            </tr>
          </table>

          <!-- Price breakdown -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:12px;overflow:hidden;margin-bottom:28px;">
            <tr style="background:#f9f6f2;">
              <td colspan="2" style="padding:14px 20px;font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Rincian Biaya</td>
            </tr>
            <tr style="border-top:1px solid #eee;">
              <td style="padding:14px 20px;font-size:13px;color:#888;">Sewa (${nights} malam)</td>
              <td style="padding:14px 20px;font-size:13px;color:#1a1a1a;text-align:right;">${formatIDR(totalPrice)}</td>
            </tr>
            <tr style="border-top:1px solid #eee;background:#fafafa;">
              <td style="padding:14px 20px;font-size:13px;color:#888;">
                Deposit jaminan
                <span style="display:block;font-size:11px;color:#aaa;margin-top:2px;">Dikembalikan setelah check-out &amp; pengecekan unit</span>
              </td>
              <td style="padding:14px 20px;font-size:13px;color:#1a1a1a;text-align:right;vertical-align:top;">${formatIDR(deposit)}</td>
            </tr>
            <tr style="border-top:2px solid #e0d4c8;background:#fdf6ee;">
              <td style="padding:16px 20px;font-size:15px;font-weight:700;color:#7c5c3e;">Total Pembayaran</td>
              <td style="padding:16px 20px;font-size:15px;font-weight:800;color:#7c5c3e;text-align:right;">${formatIDR(grandTotal)}</td>
            </tr>
          </table>

          <!-- Note: instruksi bayar sudah diberikan di website, email ini hanya sebagai arsip -->
          <div style="background:#fff8f0;border-left:4px solid #f4a261;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#c0621a;">Informasi Pembayaran</p>
            <p style="margin:0;font-size:13px;color:#555;line-height:1.7;">
              Pembayaran dilakukan via <strong>QRIS</strong> sesuai nominal di atas.
              Booking akan dikonfirmasi setelah pembayaran diverifikasi oleh tim kami.
              Simpan email ini sebagai bukti pesanan Anda.
            </p>
          </div>

          <!-- WhatsApp CTA — Email 1 -->
          <div style="text-align:center;margin-bottom:12px;">
            <a href="https://wa.me/6285121314631?text=${waText}"
               style="display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#fff;font-weight:700;font-size:14px;padding:13px 32px;border-radius:50px;text-decoration:none;box-shadow:0 4px 12px rgba(37,211,102,0.35);">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.118.553 4.107 1.521 5.833L.057 23.272a.75.75 0 0 0 .92.92l5.438-1.464A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.705 9.705 0 0 1-4.953-1.355l-.355-.212-3.678.99.99-3.617-.23-.372A9.705 9.705 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
              </svg>
              Ada pertanyaan? Hubungi kami via WhatsApp
            </a>
          </div>
          <p style="margin:8px 0 0;font-size:12px;color:#bbb;line-height:1.6;text-align:center;">
            atau hubungi via telepon: <a href="tel:+6285121314631" style="color:#7c5c3e;">+62 851 2131 4631</a>
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9f6f2;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0 0 4px;font-size:12px;color:#aaa;">Ndalem Pleret Guest House & Residences</p>
          <p style="margin:0;font-size:12px;color:#aaa;">Jl. Pleret Dalam IV No.6, Banyuanyar, Banjarsari, Surakarta 57100</p>
          <p style="margin:8px 0 0;font-size:11px;color:#ccc;">Email ini dikirim otomatis. Mohon jangan membalas email ini langsung.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Template 2: Booking Dikonfirmasi (dikirim saat admin klik "Konfirmasi") ──
function buildConfirmationHtml(data: {
  bookingRef: string;
  guestName: string;
  unitName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  guestCount: number;
}): string {
  const { bookingRef, guestName, unitName, checkIn, checkOut, nights, totalPrice, guestCount } = data;
  const deposit = 500000;
  const roomTotal = totalPrice;
  const grandTotal = roomTotal + deposit;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Konfirmasi Pesanan — Ndalem Pleret</title>
</head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- Header -->
        <tr><td style="background:#7c5c3e;border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Ndalem Pleret</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;letter-spacing:1px;text-transform:uppercase;">Guest House & Residences · Solo</p>
        </td></tr>

        <!-- Green success bar -->
        <tr><td style="background:#2d6a4f;padding:20px 40px;text-align:center;">
          <p style="margin:0;color:#fff;font-size:17px;font-weight:700;">Pesanan Anda Telah Dikonfirmasi</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:40px;">

          <p style="margin:0 0 8px;color:#555;font-size:14px;">Halo, <strong style="color:#1a1a1a;">${guestName}</strong>,</p>
          <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.7;">
            Pembayaran Anda telah kami terima dan pesanan Anda <strong style="color:#2d6a4f;">sudah final dan terkonfirmasi</strong>.
            Tidak ada langkah tambahan yang perlu dilakukan. Cukup datang dan nikmati masa menginap Anda di Ndalem Pleret.
          </p>

          <!-- Booking ref badge -->
          <div style="background:#fdf6ee;border:2px dashed #c8956a;border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;">
            <p style="margin:0 0 4px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Kode Pesanan Anda</p>
            <p style="margin:0;color:#7c5c3e;font-size:28px;font-weight:800;font-family:monospace;letter-spacing:2px;">${bookingRef}</p>
            <p style="margin:6px 0 0;color:#aaa;font-size:11px;">Simpan kode ini sebagai bukti pesanan Anda</p>
          </div>

          <!-- Detail table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:12px;overflow:hidden;margin-bottom:28px;">
            <tr style="background:#f9f6f2;">
              <td colspan="2" style="padding:14px 20px;font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Detail Pesanan</td>
            </tr>
            <tr style="border-top:1px solid #eee;">
              <td style="padding:14px 20px;font-size:13px;color:#888;width:45%;">Unit</td>
              <td style="padding:14px 20px;font-size:13px;color:#1a1a1a;font-weight:600;">${unitName}</td>
            </tr>
            <tr style="border-top:1px solid #eee;background:#fafafa;">
              <td style="padding:14px 20px;font-size:13px;color:#888;">Check-in</td>
              <td style="padding:14px 20px;font-size:13px;color:#1a1a1a;font-weight:600;">${formatDate(checkIn)}</td>
            </tr>
            <tr style="border-top:1px solid #eee;">
              <td style="padding:14px 20px;font-size:13px;color:#888;">Check-out</td>
              <td style="padding:14px 20px;font-size:13px;color:#1a1a1a;font-weight:600;">${formatDate(checkOut)}</td>
            </tr>
            <tr style="border-top:1px solid #eee;background:#fafafa;">
              <td style="padding:14px 20px;font-size:13px;color:#888;">Durasi</td>
              <td style="padding:14px 20px;font-size:13px;color:#1a1a1a;font-weight:600;">${nights} malam</td>
            </tr>
            <tr style="border-top:1px solid #eee;">
              <td style="padding:14px 20px;font-size:13px;color:#888;">Jumlah Tamu</td>
              <td style="padding:14px 20px;font-size:13px;color:#1a1a1a;font-weight:600;">${guestCount} orang</td>
            </tr>
          </table>

          <!-- Price breakdown -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:12px;overflow:hidden;margin-bottom:28px;">
            <tr style="background:#f9f6f2;">
              <td colspan="2" style="padding:14px 20px;font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Rincian Biaya</td>
            </tr>
            <tr style="border-top:1px solid #eee;">
              <td style="padding:14px 20px;font-size:13px;color:#888;">Sewa (${nights} malam)</td>
              <td style="padding:14px 20px;font-size:13px;color:#1a1a1a;text-align:right;">${formatIDR(roomTotal)}</td>
            </tr>
            <tr style="border-top:1px solid #eee;background:#fafafa;">
              <td style="padding:14px 20px;font-size:13px;color:#888;">
                Deposit jaminan
                <span style="display:block;font-size:11px;color:#aaa;margin-top:2px;">Dikembalikan setelah check-out &amp; pengecekan unit oleh penjaga</span>
              </td>
              <td style="padding:14px 20px;font-size:13px;color:#1a1a1a;text-align:right;vertical-align:top;">${formatIDR(deposit)}</td>
            </tr>
            <tr style="border-top:2px solid #e0d4c8;background:#fdf6ee;">
              <td style="padding:16px 20px;font-size:15px;font-weight:700;color:#7c5c3e;">Total</td>
              <td style="padding:16px 20px;font-size:15px;font-weight:800;color:#7c5c3e;text-align:right;">${formatIDR(grandTotal)}</td>
            </tr>
          </table>

          <!-- Check-in info box -->
          <div style="background:#f0faf5;border-left:4px solid #2d6a4f;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:20px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#2d6a4f;">Informasi Check-in</p>
            <p style="margin:0 0 10px;font-size:13px;color:#555;line-height:1.7;">
              Check-in mulai pukul <strong>14.00 WIB</strong> dan check-out paling lambat <strong>12.00 WIB</strong>.
            </p>
            <p style="margin:0;font-size:13px;color:#555;line-height:1.7;">
              Pada hari kedatangan, mohon informasikan kepada kami melalui WhatsApp agar proses check-in dapat berjalan lebih lancar.
            </p>
          </div>

          <!-- Lokasi / Google Maps -->
          <div style="background:#f9f6f2;border:1px solid #e8ddd3;border-radius:12px;padding:18px 20px;margin-bottom:28px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#7c5c3e;">Lokasi Ndalem Pleret</p>
            <p style="margin:0 0 12px;font-size:13px;color:#666;line-height:1.6;">
              Jl. Pleret Dalam IV No.6, Banyuanyar, Kec. Banjarsari<br/>Kota Surakarta, Jawa Tengah 57100
            </p>
            <a href="https://maps.app.goo.gl/p7uCeje3zdt9Tnxs9"
               style="display:inline-flex;align-items:center;gap:6px;background:#4285F4;color:#fff;font-weight:600;font-size:13px;padding:10px 20px;border-radius:8px;text-decoration:none;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              Buka di Google Maps
            </a>
          </div>

          <!-- WhatsApp CTA — green -->
          <div style="text-align:center;margin-bottom:12px;">
            <a href="https://wa.me/6285121314631?text=Halo%20Ndalem%20Pleret%2C%20saya%20punya%20pertanyaan%20mengenai%20pesanan%20${bookingRef}"
               style="display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#fff;font-weight:700;font-size:14px;padding:13px 32px;border-radius:50px;text-decoration:none;box-shadow:0 4px 12px rgba(37,211,102,0.35);">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.118.553 4.107 1.521 5.833L.057 23.272a.75.75 0 0 0 .92.92l5.438-1.464A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.705 9.705 0 0 1-4.953-1.355l-.355-.212-3.678.99.99-3.617-.23-.372A9.705 9.705 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
              </svg>
              Ada pertanyaan? Hubungi kami via WhatsApp
            </a>
          </div>

          <p style="margin:8px 0 0;font-size:12px;color:#bbb;line-height:1.6;text-align:center;">
            atau hubungi via telepon: <a href="tel:+6285121314631" style="color:#7c5c3e;">+62 851 2131 4631</a>
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9f6f2;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0 0 4px;font-size:12px;color:#aaa;">Ndalem Pleret Guest House & Residences</p>
          <p style="margin:0;font-size:12px;color:#aaa;">Jl. Pleret Dalam IV No.6, Banyuanyar, Banjarsari, Surakarta 57100</p>
          <p style="margin:8px 0 0;font-size:11px;color:#ccc;">Email ini dikirim otomatis. Mohon jangan membalas email ini langsung.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Email 1 — dikirim segera setelah booking dibuat (status: pending).
 *  Berisi instruksi pembayaran, BUKAN konfirmasi final. */
export async function sendBookingReceived(data: {
  guestEmail: string;
  bookingRef: string;
  guestName: string;
  unitName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  guestCount: number;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: data.guestEmail,
    subject: `Pesanan Diterima — ${data.bookingRef} · Ndalem Pleret`,
    html: buildReceiptHtml(data),
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
  console.log(`📧 Receipt email sent to ${data.guestEmail} [${data.bookingRef}]`);
}

/** Email 2 — dikirim HANYA saat admin mengklik "Konfirmasi" di admin panel.
 *  Berisi konfirmasi final bahwa booking sudah terkonfirmasi. */
export async function sendBookingConfirmation(data: {
  guestEmail: string;
  bookingRef: string;
  guestName: string;
  unitName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  guestCount: number;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: data.guestEmail,
    subject: `Pesanan Dikonfirmasi — ${data.bookingRef} · Ndalem Pleret`,
    html: buildConfirmationHtml(data),
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
  console.log(`📧 Confirmation email sent to ${data.guestEmail} [${data.bookingRef}]`);
}
