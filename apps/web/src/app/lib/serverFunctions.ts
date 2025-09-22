import { auth } from "@repo/auth";
import type { schema } from "@repo/database";
import { getSessionCookie } from "better-auth/cookies";
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { redirectAuth } from "@/app/lib/redirectAuth";

const _getAccess = async (h: Headers) => {
	const cookie = getSessionCookie(h) ?? "anon";

	if (!cookie || cookie === "anon") {
		return redirectAuth();
	}

	try {
		// ✅ Use request.headers instead of headers()
		const session = await auth.api.getSession({
			headers: h,
		});

		if (session?.user) {
			return { account: session.user as schema.userType };
		}

		return redirectAuth();
	} catch {
		return redirectAuth();
	}
};

/**
 * Retrieves the current authenticated user's account from the session.
 * If no active session exists, the user will be redirected using `redirectAuth()`.
 *
 * @returns An object containing the authenticated user's account.
 * @throws Redirects to "/" if the user is not authenticated.
 *
 * @example
 * ```ts
 * const { account } = await getAccess();
 *
 * console.log(account.id);
 * console.log(account.email);
 * ```
 */
export const getAccess = async () => {
	const h = new Headers(await headers());
	const cookie = getSessionCookie(h) ?? "anon";
	console.log("🚀 ~ getAccess ~ cookie:", cookie);

	const cachedFn = unstable_cache(() => _getAccess(h), [`getAccess-${cookie}`], {
		revalidate: 600, // 10 mins
		tags: ["auth-session"],
	});

	return cachedFn();
};
/**
 * Fetches a paginated list of users from the authentication API.
 * Requires a valid authenticated session (session cookies are sent automatically).
 *
 * By default, this will fetch the first 100 users, sorted by name in ascending order.
 *
 * @returns A user list response containing an array of users and the total count.
 * If an error occurs, returns a fallback object with an empty `users` array and `total = 0`.
 *
 * @example
 * ```ts
 * const { users, total } = await getUsers();
 *
 * console.log(`Total users: ${total}`);
 * console.log(users.map(u => u.name));
 * ```
 */
export async function getUsers() {
	try {
		const result = await auth.api.listUsers({
			query: {
				limit: 100,
				offset: 0,
				sortBy: "name",
				sortDirection: "asc",
			},
			// This endpoint requires session cookies.
			headers: await headers(),
		});

		return result;
	} catch (error) {
		console.log("🚀 ~ getUsers ~ error:", error);
		return {
			users: [],
			total: 0,
		};
	}
}

export async function setUserRole(userId: string, role: "admin" | "user") {
	const result = await auth.api.setRole({
		body: {
			userId: userId,
			role: role, // "admin" or "user"
		},
		// This endpoint requires session cookies.
		headers: await headers(),
	});

	return result;
}
