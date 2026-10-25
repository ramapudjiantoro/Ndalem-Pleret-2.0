# Ndalem Pleret — Booking Website

Website pemesanan guest house Ndalem Pleret, Solo — https://ndalempleret.com

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: Express.js + TypeScript + Drizzle ORM (jalan sebagai Netlify Function)
- **Database**: PostgreSQL (Supabase)
- **Email**: Resend (HTTPS API)
- **Calendar**: Google Calendar API
- **Hosting**: Netlify (static + 1 function `api`)

## Struktur singkat

| Folder | Isi |
|:---|:---|
| `client/` | Website (React). `client/public/` = foto, `sw.js`, `privacy.html`, `_redirects` |
| `client/src/pages/` | `Home`, `OrderPage`, `Admin` (gerbang login) |
| `client/src/components/admin/` | Dashboard admin, dipecah per bagian |
| `server/` | API Express. `app.ts` = app bersama, `index.ts` = server lokal |
| `shared/` | Dipakai client & server: schema DB, harga (`pricing.ts`), `format.ts`, `contact.ts` |
| `netlify/src/api.ts` | Pembungkus Express → Netlify Function |
| `script/` | `build-netlify.ts` (bundle fungsi), `dev.ts`, `setup-google-calendar.ts` |

## Setup Lokal

```bash
npm install
cp .env.example .env        # lalu isi nilainya
npm run db:push             # hanya jika schema Drizzle berubah
npm run dev                 # http://localhost:5000
npm run check               # type check (harus 0 error)
```

## Deploy (Netlify)

Deploy otomatis setiap `git push origin main` (production branch = `main`).

- Build: `npm run build:netlify` (vite build → `dist/public`, lalu bundle fungsi → `netlify/functions/api.cjs`)
- `/api/*` diarahkan ke fungsi `api` lewat `client/public/_redirects`
- Environment variable diisi di Netlify (Project configuration → Environment variables), bukan di Git
- **Setiap production deploy memakai 15 kredit** dari 300/bulan (paket Free). Uji perubahan di branch lain dulu: branch deploy & deploy preview tidak memakai kredit

Detail lengkap: lihat `DEPLOYMENT_GUIDE.md` di folder project.

## Environment Variables

Lihat `.env.example`. Di Netlify yang dipakai: `DATABASE_URL` (Supabase **Transaction pooler**, port 6543), `ADMIN_PASSWORD`, `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`.

## Admin Panel

`/admin` — password dari `ADMIN_PASSWORD`. "Ingat saya 30 hari" disimpan di browser admin.

## Google Calendar

Token dibuat dengan `npx tsx script/setup-google-calendar.ts` (login `remopdj04@gmail.com`). Aplikasi OAuth harus berstatus **In production** di Google Auth Platform, kalau tidak token kedaluwarsa tiap 7 hari.
