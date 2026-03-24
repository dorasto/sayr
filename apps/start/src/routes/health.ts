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

				const mem = process.memoryUsage();
				const checks = {
					status: healthy ? "healthy" : "unhealthy",
					timestamp: new Date().toISOString(),
					uptime: process.uptime(),
					memory: { heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024) },
					database: { status: database.status === "connected" ? "ok" : "unavailable" },
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
	} catch {
		return {
			status: "error",
		};
	}
}