# Ndalem Pleret — Booking Website

Website pemesanan homestay fullstack untuk Ndalem Pleret, Solo.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: Express.js + TypeScript + Drizzle ORM
- **Database**: PostgreSQL (Supabase)
- **Email**: Resend SDK (HTTPS API)
- **Calendar**: Google Calendar API
- **Hosting**: Hostinger VPS (Docker)

## Setup Lokal

### 1. Install dependencies
```bash
npm install
```

### 2. Konfigurasi environment
```bash
cp .env.example .env
# Edit .env dan isi nilai yang sesuai
```

### 3. Push database schema
```bash
npm run db:push
```

### 4. Jalankan development server
```bash
npm run dev
```

App akan berjalan di `http://localhost:5000`

## Build untuk Production

```bash
npm run build
npm run start
```

## Deployment (Hostinger VPS — Docker)

Deploy dilakukan via script `deploy.ps1` (sekali klik dari Windows):

1. Edit kode di lokal
2. Jalankan `deploy.ps1` → otomatis push ke GitHub, lalu SSH ke VPS untuk `git pull` + rebuild container
3. Live di https://ndalempleret.com

Lihat `DEPLOYMENT_GUIDE.md` untuk detail lengkap setup VPS, Docker, dan DNS.

## Environment Variables

Lihat `.env.example` untuk daftar lengkap variabel yang dibutuhkan.

## Admin Panel

Akses admin di `/admin` dengan password yang diset di `ADMIN_PASSWORD`.
