import { eq, inArray } from "drizzle-orm";
import { auth, db, type schema } from "..";

export * from "./label";
export * from "./organization";
export * from "./task";
export * from "./issueTemplate";
export * from "./release";
export * from "./notification";

/**
 * Standard columns for user summary in Drizzle relation queries.
 * Use with: { user: { columns: userSummaryColumns } }
 * IMPORTANT: Keep in sync with UserSummary type in schema/index.ts
 */
export const userSummaryColumns = {
	id: true,
	name: true,
	image: true,
	displayName: true,
} as const;

/**
 * Standard select fields for user summary in db.select() queries.
 * Use with: db.select(userSummarySelect).from(auth.user)
 */
export const userSummarySelect = {
	id: auth.user.id,
	name: auth.user.name,
	image: auth.user.image,
	displayName: auth.user.displayName,
};

/**
 * Fetches a single user by its unique id.
 *
 * @param uesr_id - The unique slug identifier of the user.
 * @returns A promise that resolves to the user's data if found,
 * or `null` if no user exists with the given slug.
 *
 * @example
 * ```ts
 * const user = await getUserById("user-id");
 *
 * if (user) {
 *   console.log(`User: ${user.name} (${user.image})`);
 * } else {
 *   console.log("User not found.");
 * }
 * ```
 */
export async function getUserById(uesr_id: string): Promise<schema.userType | null> {
	const user = await db.query.user.findFirst({
		where: (user) => eq(user.id, uesr_id),
	});
	if (user) {
		return {
			...user,
		};
	}
	return null;
}

/**
 * Fetches multiple users by their unique IDs.
 *
 * @param userIds - An array of unique user IDs to look up.
 * @returns A promise that resolves to an array of UserSummary objects,
 * each containing the user's `id`, `name`, `image`, and `displayName`. Returns
 * an empty array if no users match the provided IDs.
 *
 * @example
 * ```ts
 * const users = await getUsersByIds(["user_123", "user_456"]);
 *
 * if (users.length > 0) {
 *   users.forEach((user) => {
 *     console.log(`User: ${user.name} (ID: ${user.id})`);
 *   });
 * } else {
 *   console.log("No users found.");
 * }
 * ```
 */
export async function getUsersByIds(userIds: string[]): Promise<schema.UserSummary[]> {
	if (!userIds.length) return [];
	const users = await db.select(userSummarySelect).from(auth.user).where(inArray(auth.user.id, userIds));
	return users;
}
