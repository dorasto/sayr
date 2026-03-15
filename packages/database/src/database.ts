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
	console.log("[db] Creating new Postgres client");

	g._pgClient = postgres(process.env.DATABASE_URL || "", {
		connect_timeout: 100,
		idle_timeout: 20,
		max: 20,

		// Log queries (you can wrap this in an env check if it's too noisy)
		debug: (connection, query, parameters) => {
			console.log("[db:query]", query, parameters);
		},

		onnotice: (notice) => {
			console.warn("[db:notice]", notice);
		},
	});

	// Optional: test connection once and log errors
	const client = g._pgClient!;

	(async () => {
		try {
			console.log("[db] Testing database connection...");
			await client`select 1 as ok`;
			console.log("[db] Database connection OK");
		} catch (err) {
			console.error("[db] Error during initial DB connection:", err);
		}
	})().catch((err) => {
		console.error("[db] Unexpected error in DB init:", err);
	});
} else {
	console.log("[db] Reusing existing Postgres client");
}

if (!g._db) {
	console.log("[db] Creating Drizzle client");
	g._db = drizzle(g._pgClient, {
		schema: combinedSchema,
	}) as DrizzleClient;
} else {
	console.log("[db] Reusing existing Drizzle client");
}

// --- Exports ---
export const client = g._pgClient!;
export const db = g._db!;

export type { DrizzleClient, PostgresClient as PgClient };