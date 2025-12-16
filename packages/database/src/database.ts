import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Import schemas
import * as auth from "../schema/auth";
import * as schema from "../schema/index";

// const connectionString = process.env.DATABASE_URL;
// // Create Postgres client
// export const client = postgres(connectionString || "", {
// 	connect_timeout: 100, // fail fast on bad conn
// 	idle_timeout: 20, // recycle idle conn
// 	max: 10, // max pool connections
// });

// // Merge schemas into one object
// export const db = drizzle(client, {
// 	schema: {
// 		...auth,
// 		...schema,
// 	},
// });

// --- Types ---
export const combinedSchema = {
	...auth,
	...schema,
};

// --- Global shared types ---
type DrizzleClient = ReturnType<typeof drizzle<typeof combinedSchema>>;
type PostgresClient = ReturnType<typeof postgres>;

// --- Global declaration (TS) ---
declare global {
	// eslint-disable-next-line no-var
	var _db: DrizzleClient | undefined;
	// eslint-disable-next-line no-var
	var _pgClient: PostgresClient | undefined;
}

// --- Create or reuse client ---
if (!global._pgClient) {
	global._pgClient = postgres(process.env.DATABASE_URL || "", {
		connect_timeout: 100,
		idle_timeout: 1,
		max: 25,
	});
}
if (!global._db) {
	global._db = drizzle(global._pgClient, { schema: combinedSchema });
}

export const db = global._db;
export const client = global._pgClient;
