import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Import schemas
import * as auth from "../schema/auth";
import * as schema from "../schema/index";

// const connectionString = process.env.DATABASE_URL?.replace(/[&?]channel_binding=require/, "");
// // Create Postgres client
// export const client = postgres(connectionString || "", {
// 	connect_timeout: 100, // fail fast on bad conn
// 	idle_timeout: 20, // recycle idle conn
// 	max: 10, // max pool connections
// 	ssl: "require", // enforce ssl explicitly
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
type DrizzleClient = ReturnType<typeof drizzle<typeof combinedSchema>>;

// --- Global declaration ---
declare global {
	// eslint-disable-next-line no-var
	var _db: DrizzleClient | undefined;
}

// --- Initialize client only once ---
const client =
	global._db ??
	drizzle(
		postgres(process.env.DATABASE_URL || "", {
			connect_timeout: 100,
			idle_timeout: 20,
			max: 15,
			ssl: "require",
		}),
		{ schema: combinedSchema }
	);

// Preserve singleton in dev
if (process.env.NODE_ENV !== "production") global._db = client;

export const db = client;
