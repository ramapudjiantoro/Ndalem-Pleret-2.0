import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config(); // load .env before reading DATABASE_URL

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set.\n" +
    "Create a .env file with: DATABASE_URL=postgresql://...\n" +
    "Get a free database at https://neon.tech"
  );
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
