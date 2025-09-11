import { auth } from "@repo/auth";
import type { schema } from "@repo/database";
import { headers } from "next/headers";
import { redirectAuth } from "@/app/lib/redirectAuth";

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
export async function getAccess() {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		if (session) {
			return { account: session.user as schema.userType };
		}
		return redirectAuth();
		// biome-ignore lint/suspicious/noExplicitAny: <da>
	} catch (error: any) {
		console.log("🚀 ~ getAccess ~ error:", error);
		console.log("🚀 ~ getAccess ~ error:", error.body);
		return redirectAuth();
	}
}

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
