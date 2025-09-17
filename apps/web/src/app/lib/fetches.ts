"use client";

export interface UpdateOrganizationData {
	name: string;
	slug: string;
	logo?: string;
	bannerImg?: string;
	description?: string;
}
/**
 * Updates an organization's details by calling the external admin API.
 *
 * This action:
 * - Sends a POST request with the updated organization data.
 * - Includes the client WebSocket ID (`wsClientId`) to support broadcast updates
 *   (ensuring events are sent to everyone except the caller).
 *
 * @param organizationId - The ID of the organization to update.
 * @param data - The organization fields to update (name, slug, logo, banner image, description).
 * @param wsClientId - A WebSocket client ID, used to broadcast changes to everyone except you.
 * @returns A promise resolving to the JSON response returned by the external API.
 *
 * @example
 * ```ts
 * const result = await updateOrganizationAction("org_123", {
 *   name: "New Org Name",
 *   slug: "new-org-slug",
 *   description: "Updated description",
 * }, "client_456");
 *
 * console.log(result.success ? "Organization updated!" : "Update failed");
 * ```
 */
export async function updateOrganizationAction(
	organizationId: string,
	data: UpdateOrganizationData,
	wsClientId: string
) {
	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/update-org`, {
		method: "POST",
		body: JSON.stringify({
			org_id: organizationId,
			wsClientId,
			data: data,
		}),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 This ensures cookies are sent
	}).then(async (e) => await e.json());
	return result;
}

/**
 * Uploads an organization's logo to the external API
 *
 * @param organizationId - The ID of the org to upload logo for
 * @param file - A File object (image) to upload
 * @returns A promise resolving to { success, image, orgId, originalName }
 *
 * @example
 * ```ts
 * const fileInput = document.querySelector("input[type=file]") as HTMLInputElement;
 * if (fileInput.files?.[0]) {
 *   const result = await uploadOrganizationLogo("org_123", fileInput.files[0]);
 *   console.log("Logo URL:", result.image);
 * }
 * ```
 */
export async function uploadOrganizationLogo(organizationId: string, file: File) {
	const formData = new FormData();
	formData.append("file", file);

	const res = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/orgs/${organizationId}/logo`, {
		method: "PUT",
		body: formData,
		credentials: "include", // ensure cookies/session
	});

	if (!res.ok) {
		throw new Error("Logo upload failed");
	}

	return res.json() as Promise<{
		success: boolean;
		image: string; // CDN/Storage URL to the new logo
		orgId: string; // orgId echoed back
		originalName: string; // original filename
	}>;
}

/**
 * Uploads an organization's banner to the external API
 *
 * @param organizationId - The ID of the org to upload banner for
 * @param file - A File object (image) to upload
 * @returns A promise resolving to { success, image, orgId, originalName }
 *
 * @example
 * ```ts
 * const fileInput = document.querySelector("input[type=file]") as HTMLInputElement;
 * if (fileInput.files?.[0]) {
 *   const result = await uploadOrganizationBanner("org_123", fileInput.files[0]);
 *   console.log("Logo URL:", result.image);
 * }
 * ```
 */
export async function uploadOrganizationBanner(organizationId: string, file: File) {
	const formData = new FormData();
	formData.append("file", file);

	const res = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/orgs/${organizationId}/banner`, {
		method: "PUT",
		body: formData,
		credentials: "include", // ensure cookies/session
	});

	if (!res.ok) {
		throw new Error("Banner upload failed");
	}

	return res.json() as Promise<{
		success: boolean;
		image: string; // CDN/Storage URL to the new banner
		orgId: string; // orgId echoed back
		originalName: string; // original filename
	}>;
}
