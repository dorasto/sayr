import { auth } from "@repo/auth";
import type { schema } from "@repo/database";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getSessionCookie } from "better-auth/cookies";
import { redirectAuth } from "@/lib/redirectAuth";

const _getAccess = async (req: Request) => {
	const h = new Headers(req.headers);
	const cookie = getSessionCookie(h) ?? "anon";

	if (!cookie || cookie === "anon") {
		redirectAuth();
	}

	try {
		const session = await auth.api.getSession({ headers: h });
		if (session?.user) {
			return { account: session.user as schema.userType };
		}
		redirectAuth();
	} catch (_error) {
		// logger.error("Error getting session", { error: _error })
		redirectAuth();
	}
};

/**
 * Retrieves the current authenticated user's account from the session.
 * If no active session exists, the user will be redirected using `redirectAuth()`.
 *
 * @returns An object containing the authenticated user's account.
 * @throws Redirects to "/" if the user is not authenticated.
 *
 * Usage (in a route beforeLoad/loader):
 *   const { account } = await getAccess()
 */
export const getAccess = createServerFn({ method: "GET" }).handler(async () => {
	const req = getRequest();
	if (!req) {
		// Should not happen in server function context
		throw new Error("No request context");
	}
	return _getAccess(req);
});

/**
 * Fetches a paginated list of users from the authentication API.
 * Requires a valid authenticated session (session cookies are sent automatically).
 */
export async function getUsers(req: Request) {
	try {
		const result = await auth.api.listUsers({
			query: {
				limit: 100,
				offset: 0,
				sortBy: "name",
				sortDirection: "asc",
			},
			headers: req.headers, // Request already carries cookies
		});
		return result;
	} catch (error) {
		// logger.error("Error fetching users", { error });
		console.log("🚀 ~ getUsers ~ error:", error);
		return { users: [], total: 0 };
	}
}

export async function setUserRole(req: Request, userId: string, role: "admin" | "user") {
	// logger.info("Setting user role", { userId, role });
	const result = await auth.api.setRole({
		body: { userId, role },
		headers: req.headers, // Request already carries cookies
	});
	return result;
}
