"use client";

import type { schema } from "@repo/database";
import { logger } from "@/app/lib/axiom/client";

/**
 * Invites one or more users to join an organization via the `/admin/organization/member` API.
 *
 * Sends a POST request with the specified organization ID and an array of user emails.
 *
 * @param organizationId - The ID of the organization to send invitations for.
 * @param emails - An array of email addresses to invite.
 *
 * @returns A promise resolving to:
 * - `success` — Whether the invitation(s) were successfully created.
 * - `data` — The created invite records (if successful).
 * - `errors` — Optional array of emails that failed to invite.
 * - `error` — Optional general error message if something went wrong.
 *
 * @example
 * ```ts
 * const result = await inviteOrganizationMembersAction("org_123", [
 *   "alice@example.com",
 *   "bob@example.com"
 * ]);
 *
 * if (result.success) {
 *   console.log("Invitations sent:", result.data);
 * } else {
 *   console.error("Invite failed:", result.error || result.errors);
 * }
 * ```
 */
export async function inviteOrganizationMembersAction(
	organizationId: string,
	emails: string[]
): Promise<{
	success: boolean;
	data?: schema.inviteType[];
	errors?: string[];
	error?: string;
}> {
	logger.info("Inviting organization members", { organizationId });

	try {
		const response = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/member`, {
			method: "POST",
			body: JSON.stringify({
				org_id: organizationId,
				emails,
			}),
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
		});

		const result = await response.json();

		if (!result.success) {
			logger.error("Failed to invite members", {
				organizationId,
				error: result.error ?? result.errors,
			});
		}

		return result;
	} catch (err) {
		logger.error("Unexpected error inviting members", {
			error: err,
			organizationId,
		});
		return {
			success: false,
			error: "Unexpected error inviting members",
		};
	}
}

/**
 * Deletes a member from an organization via the `/admin/organization/member` API.
 *
 * Sends a DELETE request with the specified organization and user IDs.
 *
 * @param organizationId - The ID of the organization from which to remove the member.
 * @param data - The member data to remove.
 * @param data.userId - The ID of the user to remove from the organization.
 *
 * @returns A promise resolving to:
 * - `success` — Whether the member was successfully deleted.
 * - `data` — The deleted member record (if successful).
 * - `error` — Optional error message if the deletion fails.
 *
 * @example
 * ```ts
 * const result = await deleteOrganizationMemberAction("org_123", { userId: "user_456" });
 *
 * if (result.success) {
 *   console.log("Member deleted:", result.data);
 * } else {
 *   console.error("Failed to delete member:", result.error);
 * }
 * ```
 */
export async function deleteOrganizationMemberAction(
	organizationId: string,
	userId: string
): Promise<{ success: boolean; data: schema.memberType; error?: string }> {
	logger.info("Deleting organization member", { organizationId, userId });
	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/member`, {
		method: "DELETE",
		body: JSON.stringify({
			org_id: organizationId,
			user_id: userId,
		}),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 This ensures cookies are sent
	}).then(async (e) => await e.json());
	if (!result.success) {
		logger.error("Failed to delete organization member", { error: result.error, organizationId });
	}
	return result;
}
