import type { UserWithRole } from "better-auth/plugins";
const API_URL = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api" : "/api";

/**
 * Set the role of a user.
 *
 * @param userId - The ID of the user whose role is to be set.
 * @param role - The new role to assign to the userq.
 * @returns A promise resolving to the result of setting the user's role.
 */
export async function consoleSetUserRoleAction(
	userId: string,
	role: "admin" | "user"
): Promise<{ success: boolean; data: UserWithRole; error?: string }> {
	const payload = {
		userId: userId,
		role: role,
	};
	const result = await fetch(`${API_URL}/console/set-role`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to set user role");
		}
		return json;
	});
	return result;
}
