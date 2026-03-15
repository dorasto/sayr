import { drizzle } from "drizzle-orm/postgres-js";
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

// Augment globalThis for dev/HMR singleton
declare global {
	// eslint-disable-next-line no-var
	var _pgClient: PostgresClient | undefined;
	// eslint-disable-next-line no-var
	var _db: ReturnType<typeof drizzle> | undefined;
}

// Ensure this file is treated as a module for `declare global`
export { };

const g = globalThis as typeof globalThis & {
	_pgClient?: PostgresClient;
	_db?: ReturnType<typeof drizzle>;
};

// --- Create or reuse client ---
if (!g._pgClient) {
	g._pgClient = postgres(process.env.DATABASE_URL || "", {
		connect_timeout: 100, // fail fast on bad conn
		idle_timeout: 20, // recycle idle conn
		max: 20, // max pool connections
	});
}

if (!g._db) {
	g._db = drizzle(g._pgClient, {
		schema: combinedSchema,
	});
}

// Non-undefined exports for consumers
export const client = g._pgClient!;
export const db = g._db!;

// Helpful exported types
export type DrizzleClient = typeof db;
export type PgClient = typeof client;