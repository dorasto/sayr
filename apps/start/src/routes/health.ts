// routes/health.ts
import { db } from "@repo/database";
import { createFileRoute } from "@tanstack/react-router";
import { sql } from "drizzle-orm";

export const Route = createFileRoute("/health")({
	server: {
		handlers: {
			GET: async () => {
				const database = await checkDatabase();
				const healthy = database.status === "connected";

				const checks = {
					status: healthy ? "healthy" : "unhealthy",
					timestamp: new Date().toISOString(),
					uptime: process.uptime(),
					memory: process.memoryUsage(),
					database,
					version: process.env.npm_package_version,
				};

				return Response.json(checks, { status: healthy ? 200 : 503 });
			},
		},
	},
});

async function checkDatabase() {
	const start = Date.now();

	try {
		await db.execute(sql`select 1`);

		return {
			status: "connected",
			latency: Date.now() - start,
		};
	} catch (error) {
		return {
			status: "error",
			error: error instanceof Error ? error.message : "Unknown database error",
		};
	}
}