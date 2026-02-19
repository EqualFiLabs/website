import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "";

if (!connectionString) {
  console.warn("DATABASE_URL not set; DB features disabled.");
}

export const db = connectionString
  ? new Pool({ connectionString })
  : null;
