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
