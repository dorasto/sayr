"use client";

export interface UpdateOrganizationData {
	name: string;
	slug: string;
	logo?: string;
	bannerImg?: string;
	description?: string;
}
export async function updateOrganizationAction(
	organizationId: string,
	data: UpdateOrganizationData,
	wsClientId: string
) {
	const start = Date.now();
	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/update-org`, {
		method: "POST",
		body: JSON.stringify({
			org_id: organizationId,
			wsClientId: `${wsClientId}-remove testing`,
			data: data,
		}),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 This ensures cookies are sent
	}).then(async (e) => await e.json());
	console.log("updateOrganization fetch took", Date.now() - start, "ms");
	return result;
}
