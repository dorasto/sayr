import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	console.error("DATABASE_URL is not set, skipping migrations.");
	process.exit(1);
}

// Use a single connection for migrations (not a pool)
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function main() {
	console.log("Running Drizzle migrations...");
	await migrate(db, { migrationsFolder: "./drizzle" });
	console.log("Migrations completed successfully.");
	await client.end();
}

main()
	.then(() => {
		process.exit(0);
	})
	.catch((err) => {
		console.error("Migration failed:", err);
		process.exit(1);
	});
