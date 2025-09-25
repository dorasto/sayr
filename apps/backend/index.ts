import { auth } from "@repo/auth/index";
import { db, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { serveStatic, websocket } from "hono/bun"; // Or 'hono/bun' for Bun
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { apiRoute } from "./routes/api";
import { wsRoute } from "./routes/ws";
export type AppEnv = {
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
};

const app = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
}>();
app.use(logger());
app.use(
	"*",
	cors({
		origin: [process.env.NEXT_PUBLIC_URL_ROOT as string, process.env.NEXT_PUBLIC_API_SERVER as string],
		allowHeaders: [],
		allowMethods: ["POST", "GET", "PATCH", "PUT"],
		exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
		maxAge: 600,
		credentials: true,
	})
);
app.use("*", requestId());
app.use("*", async (c, next) => {
	c.header("X-Service-Name", "Sayr.io");
	c.header("X-Organization-Name", "Doras Media Limited");
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session) {
		return next();
	}
	c.set("user", session.user);
	c.set("session", session.session);
	return next();
});
app.get("/", serveStatic({ path: "./public/index.html" }));
app.route("/", wsRoute);
app.route("/api", apiRoute);
app.get("/ws", serveStatic({ path: "./public/ws.html" }));
app.all("*", (c) => {
	c.req.method;
	const responseBody = generateNotFoundResponse(c.req.method, c.req.path);
	return c.json(responseBody, 404);
});
app.onError((err, c) => {
	const path = c.req.path;
	const method = c.req.method;
	console.error(`🚨 Error in [${method} ${path}] \n`, err);
	// Respond to client with minimal info
	return c.json(
		{
			success: false,
			error: err.cause?.toString() ?? err.toString(),
			path,
			method,
		},
		500
	);
});
export default {
	port: 5468,
	fetch: app.fetch,
	websocket,
};

const generateNotFoundResponse = (method: string, url: string) => ({
	message: `Route ${method}:${url} not found`,
	error: "Not Found",
	status: 404,
});

export async function getOrganization(orgId: string, userId: string): Promise<{ id: string } | null> {
	// Check if the user is a member of this org
	const membership = await db.query.member.findFirst({
		where: and(eq(schema.member.organizationId, orgId), eq(schema.member.userId, userId)),
	});

	// If no membership found, deny access
	if (!membership) {
		return null; // or throw new Error("Unauthorized");
	}

	// Fetch the organization itself
	const [organization] = await db
		.select({ id: schema.organization.id })
		.from(schema.organization)
		.where(eq(schema.organization.id, orgId));

	if (!organization) return null;

	return organization;
}

/**
 * Verifies a user's membership role within an organization.
 *
 * @param userId - The ID of the user (from session)
 * @param orgId - The ID of the organization
 * @param allowedRoles - Array of roles allowed to pass authorization
 *                       (default: ["owner", "admin"])
 * @returns A promise that resolves to a boolean indicating whether the user
 *          is authorized
 *
 * @example
 * ```ts
 * const canManage = await checkMembershipRole(session?.userId, "org_123");
 * if (!canManage) {
 *   throw new Error("UNAUTHORIZED");
 * }
 *
 * // With custom roles
 * const canEdit = await checkMembershipRole(session?.userId, "org_123", [
 *   "editor",
 *   "moderator",
 * ]);
 * ```
 */
export async function checkMembershipRole(
	userId: string | undefined,
	orgId: string,
	allowedRoles: string[] = ["owner", "admin"]
): Promise<boolean> {
	if (!userId) return false;

	const role = await db
		.select()
		.from(schema.member)
		.where(and(eq(schema.member.userId, userId), eq(schema.member.organizationId, orgId)));

	return allowedRoles.includes(role[0]?.role || "");
}
