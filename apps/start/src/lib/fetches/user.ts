import type { schema } from "@repo/database";

const API_URL = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

export interface UpdateUserData {
	displayName?: string;
}

/**
 * Update the current user's profile.
 *
 * @param data - The user data to update.
 * @returns A promise resolving to the update result.
 */
export async function updateUserAction(data: UpdateUserData): Promise<{
	success: boolean;
	data?: schema.userType;
	error?: string;
}> {
	const result = await fetch(`${API_URL}/v1/admin/user/update`, {
		method: "PATCH",
		body: JSON.stringify(data),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (e) => await e.json());

	if (!result.success) {
		console.error("Failed to update user", { error: result.error });
	}

	return result;
}
