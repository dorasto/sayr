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

/**
 * Upload the current user's profile picture.
 *
 * @param file - The image file to upload.
 * @param old - The URL of the previous profile picture, or null if none.
 * @returns A promise resolving to the upload result with updated user data.
 */
export async function uploadUserProfilePicture(
	file: File,
	old: string | undefined | null
): Promise<{
	success: boolean;
	data?: schema.userType;
	image?: string;
	originalName?: string;
	error?: string;
}> {
	const formData = new FormData();
	formData.append("file", file);

	try {
		const res = await fetch(`${API_URL}/v1/admin/user/profile-picture`, {
			method: "PUT",
			body: formData,
			credentials: "include",
			headers: {
				"X-old-file": old || "",
			},
		});

		const result = await res.json();

		if (!res.ok) {
			return { success: false, error: result.error || "Profile picture upload failed" };
		}

		return result;
	} catch (error) {
		console.error("Failed to upload profile picture", { error });
		return { success: false, error: "Profile picture upload failed" };
	}
}
