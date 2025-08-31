"use server";

import { auth } from "@repo/auth";
import { headers } from "next/headers";

export interface UpdateOrganizationData {
	name: string;
	slug: string;
	logo?: string;
	metadata?: Record<string, unknown>;
}

export async function updateOrganizationAction(organizationId: string, data: UpdateOrganizationData) {
	try {
		const result = await auth.api.updateOrganization({
			body: {
				data,
				organizationId,
			},
			headers: await headers(),
		});

		return {
			success: true,
			data: result,
		};
	} catch (error) {
		console.error("Failed to update organization:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to update organization",
		};
	}
}
