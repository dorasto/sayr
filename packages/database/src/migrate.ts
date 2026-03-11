import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	console.error("DATABASE_URL is not set, skipping migrations.");
	process.exit(1);
}

// Single connection, no prepared statements (avoids issues with pgbouncer / Bun)
const client = postgres(connectionString, { max: 1, prepare: false, idle_timeout: 5, connect_timeout: 30 });
const db = drizzle(client);

console.log("Running Drizzle migrations...");
migrate(db, { migrationsFolder: "./drizzle" })
	.then(async () => {
		console.log("Migrations completed successfully.");
		await client.end({ timeout: 5 });
		process.exit(0);
	})
	.catch(async (err) => {
		console.error("Migration failed:", err);
		try {
			await client.end({ timeout: 5 });
		} catch (_) {
			// ignore cleanup errors
		}
		process.exit(1);
	});
