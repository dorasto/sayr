import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Import schemas
import * as auth from "../schema/auth";
import * as schema from "../schema/index";

// --- Combined schema ---
export const combinedSchema = {
	...auth,
	...schema,
};

type PostgresClient = ReturnType<typeof postgres>;
type DrizzleClient = PostgresJsDatabase<typeof combinedSchema>;

// --- Global declaration (TS) ---
declare global {
	// eslint-disable-next-line no-var
	var _pgClient: PostgresClient | undefined;
	// eslint-disable-next-line no-var
	var _db: DrizzleClient | undefined;
}

// Make this file a module so `declare global` works
export { };

const g = globalThis as typeof globalThis & {
	_pgClient?: PostgresClient;
	_db?: DrizzleClient;
};

// --- Create or reuse client ---
if (!g._pgClient) {
	g._pgClient = postgres(process.env.DATABASE_URL || "", {
		connect_timeout: 100,
		idle_timeout: 20,
		max: 20,
	});
}

if (!g._db) {
	g._db = drizzle(g._pgClient, {
		schema: combinedSchema,
	}) as DrizzleClient;
}

// --- Exports ---
export const client = g._pgClient!;
export const db = g._db!;

export type { DrizzleClient, PostgresClient as PgClient };