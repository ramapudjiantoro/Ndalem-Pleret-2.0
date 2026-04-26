# Ndalem Pleret — Booking Website

Website pemesanan homestay fullstack untuk Ndalem Pleret, Solo.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: Express.js + TypeScript + Drizzle ORM
- **Database**: PostgreSQL (Supabase)
- **Email**: Nodemailer + Gmail SMTP
- **Calendar**: Google Calendar API

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

## Deployment (Railway)

1. Push ke GitHub
2. Buat project baru di [railway.app](https://railway.app)
3. Connect ke GitHub repo ini
4. Tambahkan environment variables (lihat `.env.example`)
5. Railway akan auto-deploy setiap push ke `main`

## Environment Variables

Lihat `.env.example` untuk daftar lengkap variabel yang dibutuhkan.

## Admin Panel

Akses admin di `/admin` dengan password yang diset di `ADMIN_PASSWORD`.
