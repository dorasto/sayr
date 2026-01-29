import { auth } from "@repo/auth";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { createTraceAsync } from "@repo/opentelemetry/trace";

export const apiRouteConsole = new Hono<AppEnv>();

apiRouteConsole.post("/set-role", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const session = c.get("session");
	const user = c.get("user");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	if (user?.role !== "admin") {
		await recordWideError({
			name: "console.set_role.forbidden",
			error: new Error("Forbidden"),
			code: "FORBIDDEN",
			message: "User does not have admin privileges",
			contextData: {
				user: { id: user?.id },
			},
		});
		return c.json({ success: false, error: "FORBIDDEN" }, 403);
	}

	const body = await c.req.json().catch(() => null);
	const {
		userId,
		role,
	}: { userId: string; role: "admin" | "user" } = body ?? {};

	if (!userId || !role) {
		await recordWideError({
			name: "console.set_role.validation",
			error: new Error("Invalid request data"),
			code: "INVALID_REQUEST",
			message: "User ID or role missing",
			contextData: {
				user: { id: session.userId },
			},
		});
		return c.json({ success: false, error: "Invalid request data" }, 400);
	}

	const result = await traceAsync(
		"console.set_role.update",
		() =>
			auth.api.setRole({
				body: { userId, role },
				headers: c.req.raw.headers,
			}),
		{
			description: "Updating user role",
			data: {
				user: { id: userId },
				admin: { id: session.userId },
				role,
			},
			onSuccess: () => ({
				outcome: "User role updated",
				data: {
					user: { id: userId },
					role,
				},
			}),
		}
	);
	return c.json({ success: true, data: result?.user });
});