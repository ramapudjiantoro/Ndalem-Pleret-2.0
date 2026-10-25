import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be set in production.");
  }
  console.warn(
    "\n⚠️  DATABASE_URL is not set.\n" +
    "   API endpoints will not work until you add it to your .env file.\n" +
    "   Get a free database at https://neon.tech and add:\n" +
    "   DATABASE_URL=postgresql://...\n"
  );
}

// Di Netlify Functions (AWS Lambda) tiap instance memegang pool sendiri, jadi dibatasi
// kecil supaya banyak instance paralel tidak menghabiskan slot koneksi Supabase.
const isServerless = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// Pool is only created when DATABASE_URL is available
export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ...(isServerless ? { max: 2, idleTimeoutMillis: 10_000 } : {}),
    })
  : null;

export const db = process.env.DATABASE_URL
  ? drizzle(pool as pg.Pool, { schema })
  : null;
