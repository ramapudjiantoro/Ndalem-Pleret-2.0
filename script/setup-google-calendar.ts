/**
 * Script satu kali untuk mendapatkan Google OAuth Refresh Token.
 *
 * Cara pakai:
 *   npx tsx script/setup-google-calendar.ts
 *
 * Prasyarat:
 *   1. Isi GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET di .env terlebih dulu
 *   2. Pastikan http://localhost:3001/callback sudah ditambahkan sebagai
 *      Authorized Redirect URI di Google Cloud Console
 */

import "dotenv/config";
import { google } from "googleapis";
import http from "http";
import { URL } from "url";

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = "http://localhost:3001/callback";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("\n❌ GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum diisi di .env\n");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/calendar"],
  prompt: "consent",  // Paksa refresh_token diberikan
});

console.log("\n══════════════════════════════════════════════════════");
console.log("  Setup Google Calendar — Ndalem Pleret");
console.log("══════════════════════════════════════════════════════\n");
console.log("1. Buka URL berikut di browser:\n");
console.log("   " + authUrl);
console.log("\n2. Login dengan akun: remopdj04@gmail.com");
console.log("3. Izinkan akses Google Calendar");
console.log("4. Anda akan diredirect ke localhost — tunggu hasil di terminal ini\n");

// Jalankan server lokal sementara untuk menangkap code dari redirect
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url!, `http://localhost:3001`);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<h2>❌ Error: ${error}</h2><p>Tutup tab ini dan coba lagi.</p>`);
      server.close();
      return;
    }

    if (!code) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h2>❌ Tidak ada kode. Tutup tab ini.</h2>");
      server.close();
      return;
    }

    // Tukar code dengan tokens
    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      <h2>✅ Berhasil! Tutup tab ini dan lihat terminal.</h2>
      <p>Google Calendar sudah terhubung dengan Ndalem Pleret.</p>
    `);

    console.log("\n══════════════════════════════════════════════════════");
    console.log("  ✅ Berhasil mendapatkan token!");
    console.log("══════════════════════════════════════════════════════\n");
    console.log("Tambahkan baris berikut ke file .env Anda:\n");
    console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("\n══════════════════════════════════════════════════════\n");

    server.close();
  } catch (err: any) {
    console.error("\n❌ Gagal:", err.message);
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h2>❌ Gagal: ${err.message}</h2>`);
    server.close();
  }
});

server.listen(3001, () => {
  console.log("⏳ Menunggu autentikasi Google... (server lokal berjalan di port 3001)\n");
});

server.on("error", (err) => {
  console.error("❌ Port 3001 sedang dipakai. Tutup aplikasi lain yang memakai port ini lalu coba lagi.");
  process.exit(1);
});
