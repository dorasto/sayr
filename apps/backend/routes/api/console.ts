import { auth } from "@repo/auth";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { createTraceAsync } from "@/tracing/wideEvent";

export const apiRouteConsole = new Hono<AppEnv>();

// Get all tasks assigned to the logged-in user
apiRouteConsole.post("/set-role", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const recordWideEvent = c.get("recordWideEvent");

	const session = c.get("session");

	if (!session?.userId) {
		await recordWideError({
			name: "console.set_role.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User not authenticated",
			contextData: {},
		});
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const user = c.get("user");

	if (user?.role !== "admin") {
		await recordWideError({
			name: "console.set_role.forbidden",
			error: new Error("Forbidden"),
			code: "FORBIDDEN",
			message: "User does not have admin privileges",
			contextData: { userId: user?.id },
		});
		return c.json({ success: false, error: "FORBIDDEN" }, 403);
	}

	const { userId, role }: { userId: string; role: "admin" | "user" } = await c.req.json();

	if (!userId || !role) {
		await recordWideError({
			name: "console.set_role.validation",
			error: new Error("Invalid request data"),
			code: "INVALID_REQUEST",
			message: "User ID or role missing",
			contextData: { adminId: session.userId },
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
			data: { userId, role, adminId: session.userId },
			onSuccess: () => ({
				description: "User role updated successfully",
				data: { userId, newRole: role },
			}),
		}
	);

	await recordWideEvent({
		name: "console.set_role.success",
		description: "User role updated successfully",
		data: {
			userId,
			newRole: role,
			adminId: session.userId,
		},
	});

	return c.json({ success: true, data: result?.user });
});
