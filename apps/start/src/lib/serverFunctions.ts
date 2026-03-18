import { auth } from "@repo/auth";
import { getOrganizations as dbGetOrganizations, type schema } from "@repo/database";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Helper to normalize better-auth user to schema.userType
 */
function normalizeUser(user: typeof auth.$Infer.Session.user): schema.userType {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		emailVerified: user.emailVerified,
		image: user.image ?? null,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
		role: user.role ?? null,
		banned: user.banned ?? null,
		banReason: user.banReason ?? null,
		banExpires: user.banExpires ?? null,
	};
}

/**
 * Retrieves the current authenticated user's account from the session.
 * If no active session exists, the user will be redirected to "/home/login".
 *
 * @returns An object containing the authenticated user's account.
 * @throws Redirects to "/home/login" if the user is not authenticated.
 *
 * Usage (in a route beforeLoad/loader):
 *   const { account } = await getAccess()
 */
export const getAccess = createServerFn({ method: "GET" }).handler(async () => {
	const headers = getRequestHeaders();
	const h = new Headers(headers);
	const cookie = getSessionCookie(h);

	if (!cookie) {
		throw redirect({ to: "/login" });
	}

	try {
		const session = await auth.api.getSession({ headers: h });
		if (session?.user) {
			return { account: normalizeUser(session.user) };
		}
		throw redirect({ to: "/login" });
	} catch (error) {
		// If it's already a redirect, re-throw it
		if (error && typeof error === "object" && "redirect" in error) {
			throw error;
		}
		throw redirect({ to: "/login" });
	}
});

/**
 * Retrieves all organizations for a user - wrapped as a server function
 * for use in TanStack Start loaders.
 */
export const getOrganizations = createServerFn({ method: "GET" })
	.inputValidator((data: { userId: string }) => data)
	.handler(async ({ data }) => {
		return dbGetOrganizations(data.userId);
	});

/**
 * Fetches a paginated list of users from the authentication API.
 * Requires a valid authenticated session.
 */
export const getUsers = createServerFn({ method: "GET" }).handler(async () => {
	const headers = getRequestHeaders();
	try {
		const result = await auth.api.listUsers({
			query: {
				limit: 100,
				offset: 0,
				sortBy: "name",
				sortDirection: "asc",
			},
			headers: new Headers(headers),
		});
		return result;
	} catch (error) {
		console.log("🚀 ~ getUsers ~ error:", error);
		return { users: [], total: 0 };
	}
});

/**
 * Sets the role for a user.
 */
export const setUserRole = createServerFn({ method: "POST" })
	.inputValidator((data: { userId: string; role: "admin" | "user" }) => data)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const result = await auth.api.setRole({
			body: { userId: data.userId, role: data.role },
			headers: new Headers(headers),
		});
		return result;
	});

export type FirehoseClient = {
	sseClientId: string;
	clientId: string;
	orgId: string;
	channel: string;
	lastPong: number;
	lastLatency: number;
	lastMessageAt: number;
	connectedAt: number;
	authenticated: boolean;
};

const BASE_URL = import.meta.env.VITE_API_URL || "";

export const getConnections = createServerFn({ method: "GET" }).handler(async () => {
	const headers = getRequestHeaders();

	try {
		const response = await fetch(`${BASE_URL}/events/connections`, {
			headers: new Headers(headers),
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: "Failed to fetch connections" }));
			throw new Error(error.error || "Failed to fetch connections");
		}

		const result = await response.json();
		return result as { success: true; data: FirehoseClient[] };
	} catch (error) {
		console.error("getConnections error:", error);
		return { success: false, data: [] as FirehoseClient[], error: (error as Error).message };
	}
});
