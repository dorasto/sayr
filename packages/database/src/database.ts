import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Import schemas
import * as auth from "../schema/auth";
import * as schema from "../schema/index";

// Create Postgres client
export const client = postgres(process.env.DATABASE_URL || "");

// Merge schemas into one object
export const db = drizzle(client, {
  schema: {
    ...auth,
    ...schema,
  },
});