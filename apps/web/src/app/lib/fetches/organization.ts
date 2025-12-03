"use client";

import type { schema } from "@repo/database";
import { logger } from "@/app/lib/axiom/client";

export interface UpdateOrganizationData {
	name: string;
	slug: string;
	logo?: string;
	bannerImg?: string;
	description?: string;
}

/**
 * Calls the `/admin/organization/update` API to update an organization's details.
 *
 * Sends a POST request containing updated organization data.
 * Supports WebSocket broadcast by including the `wsClientId`.
 *
 * @param organizationId - The ID of the organization to update.
 * @param data - The properties of the organization to update:
 * - `name` (required) - The organization's display name.
 * - `slug` (required) - The unique slug for URLs.
 * - `logo` (optional) - The URL or path to the organization logo.
 * - `bannerImg` (optional) - The URL or path to the banner image.
 * - `description` (optional) - The text description of the organization.
 * @param wsClientId - The WebSocket client ID (used to push broadcast updates).
 * @returns A promise resolving to:
 * - `success` — Indicates whether the update succeeded.
 * - `data` — The updated organization record.
 * - `error` — Optional error message if update fails.
 *
 * @example
 * ```ts
 * const result = await updateOrganizationAction(
 *   "org_123",
 *   {
 *     name: "New Org Name",
 *     slug: "new-org-slug",
 *     description: "An updated description",
 *   },
 *   "client_456"
 * );
 *
 * if (result.success) {
 *   console.log("Organization updated:", result.data);
 * } else {
 *   console.error("Failed to update:", result.error);
 * }
 * ```
 */
export async function updateOrganizationAction(
	organizationId: string,
	data: UpdateOrganizationData,
	wsClientId: string
): Promise<{ success: boolean; data: schema.organizationType; error?: string }> {
	logger.info("Updating organization", { organizationId, data });
	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/update`, {
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
	if (!result.success) {
		logger.error("Failed to update organization", { error: result.error, organizationId });
	}
	return result;
}

/**
 * Calls the `/admin/organization/{orgId}/logo` API to upload an organization's logo.
 *
 * Uploads a new image for the organization's logo. Optionally replaces an existing logo if specified.
 *
 * @param organizationId - The ID of the organization.
 * @param file - The logo file to upload.
 * @param old - The URL of the logo file being replaced, or null if uploading for the first time.
 * @returns A promise resolving to:
 * - `success` — Whether the upload succeeded.
 * - `image` — The storage/CDN URL of the uploaded logo.
 * - `orgId` — The organization ID that received the new logo.
 * - `originalName` — The original filename of the uploaded image.
 *
 * @example
 * ```ts
 * const fileInput = document.querySelector("input[type='file']");
 * if (fileInput.files?.[0]) {
 *   const result = await uploadOrganizationLogo("org_123", fileInput.files[0]);
 *   console.log("Uploaded logo:", result.image);
 * }
 * ```
 */
export async function uploadOrganizationLogo(organizationId: string, file: File, old: string | undefined | null) {
	const formData = new FormData();
	formData.append("file", file);

	const res = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/${organizationId}/logo`, {
		method: "PUT",
		body: formData,
		credentials: "include", // ensure cookies/session
		headers: {
			"X-old-file": old || "",
		},
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
 * Calls the `/admin/organization/{orgId}/banner` API to upload an organization's banner image.
 *
 * Replaces or adds a new banner image for the given organization.
 *
 * @param organizationId - The ID of the organization.
 * @param file - The banner image file to upload.
 * @param old - The URL of the previous banner, or null if adding a new one.
 * @returns A promise resolving to:
 * - `success` — Whether the upload succeeded.
 * - `image` — The storage/CDN URL of the new banner.
 * - `orgId` — The organization ID the banner was uploaded for.
 * - `originalName` — The original filename of the uploaded banner.
 *
 * @example
 * ```ts
 * const file = new File(["...binary"], "banner.png", { type: "image/png" });
 * const result = await uploadOrganizationBanner("org_123", file, null);
 * console.log("Banner updated:", result.image);
 * ```
 */
export async function uploadOrganizationBanner(organizationId: string, file: File, old: string | undefined | null) {
	const formData = new FormData();
	formData.append("file", file);

	const res = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/${organizationId}/banner`, {
		method: "PUT",
		body: formData,
		credentials: "include", // ensure cookies/session
		headers: {
			"X-old-file": old || "",
		},
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

/**
 * Handles accepting or denying an organization invitation via the
 * `/admin/invite` API endpoint.
 *
 * Sends a POST request containing the full invite object and the chosen action type.
 * This is typically triggered when a user clicks "Accept" or "Decline" on an invitation page.
 *
 * @param invite - The invitation record object representing the pending invite.
 * @param type - The action to perform on the invite:
 * - `"accept"` — Accepts the invitation, granting the user membership in the organization.
 * - `"deny"` — Declines the invitation, marking it as rejected.
 *
 * @returns A promise resolving to:
 * - `success` — Whether the invite action completed successfully.
 * - `error` — Optional error message if the API request fails or is rejected.
 *
 * @example
 * ```ts
 * import { inviteAction } from "@/app/actions/inviteAction";
 *
 * const result = await inviteAction(inviteRecord, "accept");
 *
 * if (result.success) {
 *   console.log("Invite accepted!");
 * } else {
 *   console.error("Invite failed:", result.error);
 * }
 * ```
 */
export async function inviteAction(
	invite: schema.inviteType,
	type: "accept" | "deny"
): Promise<{
	success: boolean;
	error?: string;
}> {
	logger.info("Inviting organization member", { invite, type });
	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/invite`, {
		method: "POST",
		body: JSON.stringify({ invite, type }),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (e) => await e.json());
	if (!result.success) {
		logger.error("Failed to invite member", { error: result.error, invite, type });
		return {
			success: false,
			error: result.error,
		};
	}
	logger.info("Invite accepted", { invite, type });
	return {
		success: true,
	};
}

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

/**
 * Calls the `/admin/organization/create-label` API to create new labels in an organization.
 *
 * @param organizationId - The ID of the organization the labels belong to.
 * @param data - The label properties:
 * - `name` (required) - The label name.
 * - `color` (required) - The label hex color code.
 * @param wsClientId - The WebSocket client ID (for broadcasting updates).
 * @returns A promise resolving to:
 * - `success` — Whether the label creation succeeded.
 * - `data` — An array of label records created or returned by the server.
 * - `error` — Optional error message if creation failed.
 *
 * @example
 * ```ts
 * const labels = await createLabelAction("org_123", {
 *   name: "Bug",
 *   color: "#ff0000"
 * }, "ws_123");
 *
 * if (labels.success) console.log("Created labels:", labels.data);
 * ```
 */
export async function createLabelAction(
	organizationId: string,
	data: {
		name: string;
		color: string;
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.labelType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		name: data.name,
		color: data.color,
		wsClientId,
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/create-label`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 ensures cookies/session are sent
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to create label");
		}
		return json;
	});

	return result;
}

/**
 * Calls the `/admin/organization/edit-label` API to update an existing label in an organization.
 *
 * @param organizationId - The ID of the organization the labels belong to.
 * @param data - The label properties to update:
 * - `id` (required) - The ID of the label to update.
 * - `name` (required) - The updated label name.
 * - `color` (required) - The updated label hex color code.
 * @param wsClientId - The WebSocket client ID (for broadcasting updates).
 * @returns A promise resolving to:
 * - `success` — Whether the label update succeeded.
 * - `data` — An array of label records returned by the server.
 * - `error` — Optional error message if the update failed.
 *
 * @example
 * ```ts
 * const labels = await editLabelAction("org_123", {
 *   id: "label_001",
 *   name: "Priority",
 *   color: "#FFD700",
 * }, "ws_456");
 *
 * if (labels.success) console.log("Updated labels:", labels.data);
 * ```
 */
export async function editLabelAction(
	organizationId: string,
	data: {
		id: string;
		name: string;
		color: string;
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.labelType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		id: data.id,
		name: data.name,
		color: data.color,
		wsClientId,
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/edit-label`, {
		method: "PATCH",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 ensures cookies/session are sent
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to edit label");
		}
		return json;
	});

	return result;
}

/**
 * Calls the `/admin/organization/delete-label` API to delete a label from an organization.
 *
 * @param organizationId - The ID of the organization the labels belong to.
 * @param data - The label properties for deletion:
 * - `id` (required) - The ID of the label to delete.
 * @param wsClientId - The WebSocket client ID (for pushing changes).
 * @returns A promise resolving to:
 * - `success` — Whether the label was deleted successfully.
 * - `data` — An array of remaining label records returned by the server.
 * - `error` — Optional error message if deletion failed.
 *
 * @example
 * ```ts
 * const labels = await deleteLabelAction("org_123", { id: "label_002" }, "ws_789");
 * if (labels.success) console.log("Labels after deletion:", labels.data);
 * ```
 */
export async function deleteLabelAction(
	organizationId: string,
	data: {
		id: string;
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.labelType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		id: data.id,
		wsClientId,
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/delete-label`, {
		method: "DELETE",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 ensures cookies/session are sent
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to delete label");
		}
		return json;
	});

	return result;
}

/**
 * Calls the `/admin/organization/create-view` API to create a saved view in an organization.
 *
 * @param organizationId - The ID of the organization the views belong to.
 * @param data - The view properties:
 * - `name` (required) - The name of the view.
 * - `value` (required) - The encoded filter or configuration string.
 * @param wsClientId - The WebSocket client ID (for pushing changes).
 * @returns A promise resolving to:
 * - `success` — Whether the view creation succeeded.
 * - `data` — An array of saved view records created or returned by the server.
 * - `error` — Optional error message if creation failed.
 *
 * @example
 * ```ts
 * const views = await createSavedViewAction("org_123", {
 *   name: "My Open Tasks",
 *   value: "W1tbInJmIl0=",
 * }, "ws_001");
 *
 * if (views.success) console.log("Created views:", views.data);
 * ```
 */
export async function createSavedViewAction(
	organizationId: string,
	data: {
		name: string;
		value: string;
		viewConfig?: Record<string, unknown>;
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.savedViewType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		name: data.name,
		value: data.value,
		view_config: data.viewConfig,
		wsClientId,
	};
	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/create-view`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 ensures cookies/session are sent
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to create view");
		}
		return json;
	});

	return result;
}

/**
 * Calls the `/admin/organization/update-view` API to update a saved view in an organization.
 *
 * @param organizationId - The ID of the organization the views belong to.
 * @param data - The view properties to update:
 * - `id` (required) - The ID of the view to update.
 * - `name` (optional) - The updated name of the view.
 * - `value` (optional) - The updated encoded filter string.
 * - `viewConfig` (optional) - The updated view configuration.
 * @param wsClientId - The WebSocket client ID (for pushing changes).
 * @returns A promise resolving to:
 * - `success` — Whether the view update succeeded.
 * - `data` — An array of saved view records returned by the server.
 * - `error` — Optional error message if update failed.
 */
export async function updateSavedViewAction(
	organizationId: string,
	data: {
		id: string;
		name?: string;
		value?: string;
		viewConfig?: Record<string, unknown>;
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.savedViewType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		id: data.id,
		name: data.name,
		value: data.value,
		view_config: data.viewConfig,
		wsClientId,
	};
	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/update-view`, {
		method: "PATCH",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to update view");
		}
		return json;
	});

	return result;
}

/**
 * Calls the `/admin/organization/delete-view` API to delete a saved view from an organization.
 *
 * @param organizationId - The ID of the organization the views belong to.
 * @param data - The view properties for deletion:
 * - `id` (required) - The ID of the view to delete.
 * @param wsClientId - The WebSocket client ID (for pushing changes).
 * @returns A promise resolving to:
 * - `success` — Whether the view was deleted successfully.
 * - `data` — An array of remaining saved view records returned by the server.
 * - `error` — Optional error message if deletion failed.
 */
export async function deleteSavedViewAction(
	organizationId: string,
	data: {
		id: string;
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.savedViewType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		id: data.id,
		wsClientId,
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/delete-view`, {
		method: "DELETE",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to delete view");
		}
		return json;
	});

	return result;
}

/**
 * Calls the `/admin/organization/create-category` API to create a new category in an organization.
 *
 * @param organizationId - The ID of the organization the categories belong to.
 * @param data - The category properties:
 * - `name` (required) - The name of the category.
 * - `color` (required) - The hex color of the category.
 * - `icon` (required) - The icon identifier for the category.
 * @param wsClientId - The WebSocket client ID (for broadcasting updates).
 * @returns A promise resolving to:
 * - `success` — Whether the category creation succeeded.
 * - `data` — An array of category records created or returned by the server.
 * - `error` — Optional error message if creation failed.
 *
 * @example
 * ```ts
 * const categories = await createCategoryAction("org_123", {
 *   name: "Bug Reports",
 *   color: "#FF0000",
 *   icon: "bug"
 * }, "ws_777");
 *
 * if (categories.success) console.log("Created categories:", categories.data);
 * ```
 */
export async function createCategoryAction(
	organizationId: string,
	data: {
		name: string;
		color: string;
		icon: string;
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.categoryType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		name: data.name,
		color: data.color,
		icon: data.icon,
		wsClientId,
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/create-category`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 ensures cookies/session are sent
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to create category");
		}
		return json;
	});

	return result;
}

/**
 * Calls the `/admin/organization/edit-category` API to update an existing category in an organization.
 *
 * @param organizationId - The ID of the organization the categories belong to.
 * @param data - The category properties to update:
 * - `id` (required) - The ID of the category to update.
 * - `name` (required) - The updated category name.
 * - `color` (required) - The updated category color.
 * - `icon` (required) - The updated category icon.
 * @param wsClientId - The WebSocket client ID (used for pushing updates).
 * @returns A promise resolving to:
 * - `success` — Whether the category update succeeded.
 * - `data` — An array of updated category records returned by the server.
 * - `error` — Optional error message if the update failed.
 *
 * @example
 * ```ts
 * const categories = await editCategoryAction("org_123", {
 *   id: "cat_001",
 *   name: "Improvements",
 *   color: "#2ECC71",
 *   icon: "wrench"
 * }, "ws_002");
 *
 * if (categories.success) console.log("Updated categories:", categories.data);
 * ```
 */
export async function editCategoryAction(
	organizationId: string,
	data: {
		id: string;
		name: string;
		color: string;
		icon: string;
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.categoryType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		id: data.id,
		name: data.name,
		color: data.color,
		icon: data.icon,
		wsClientId,
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/edit-category`, {
		method: "PATCH",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 ensures cookies/session are sent
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to edit category");
		}
		return json;
	});

	return result;
}

/**
 * Calls the `/admin/organization/delete-category` API to delete a category in an organization.
 *
 * @param organizationId - The ID of the organization the categories belong to.
 * @param data - The category properties for deletion:
 * - `id` (required) - The ID of the category to delete.
 * @param wsClientId - The WebSocket client ID (for pushing changes).
 * @returns A promise resolving to:
 * - `success` — Whether the category was deleted successfully.
 * - `data` — An array of remaining category records returned by the server.
 * - `error` — Optional error message if deletion failed.
 *
 * @example
 * ```ts
 * const categories = await deleteCategoryAction("org_123", { id: "cat_003" }, "ws_010");
 *
 * if (categories.success) console.log("Remaining categories:", categories.data);
 * ```
 */
export async function deleteCategoryAction(
	organizationId: string,
	data: {
		id: string;
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.categoryType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		id: data.id,
		wsClientId,
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/delete-category`, {
		method: "DELETE",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 ensures cookies/session are sent
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to delete category");
		}
		return json;
	});

	return result;
}

/**
 * Synchronizes a GitHub repository with an organization’s task system.
 *
 * Sends a POST request to the `/admin/organization/connections/github/sync-repo`
 * API endpoint to link a GitHub repo (via installation) to an
 * organization category for task tracking or automation.
 *
 * @param organizationId - The unique ID of the organization performing the sync.
 * @param data - Repository sync details, including:
 *   - `installationId` — The GitHub App installation ID for the connected account.
 *   - `repoId` — The GitHub repository ID to sync.
 *   - `repoName` — The name of the repository.
 *   - `categoryId` — The internal category ID used to assign tasks.
 *
 * @returns A promise resolving to an object:
 * ```ts
 * {
 *   success: boolean;            // Whether the sync action succeeded
 *   data: schema.labelType[];    // Data returned by the server (labels or sync records)
 *   error?: string;              // Error message if the operation failed
 * }
 * ```
 *
 * @example
 * ```ts
 * const result = await createGithubSyncConnectionAction("org_123", {
 *   installationId: 987654,
 *   repoId: 123456,
 *   repoName: "frontend-ui",
 *   categoryId: "cat_45"
 * });
 *
 * if (result.success) {
 *   console.log("Repository synced:", result.data);
 * } else {
 *   console.error("Sync failed:", result.error);
 * }
 * ```
 */
export async function createGithubSyncConnectionAction(
	organizationId: string,
	data: {
		installationId: number;
		repoId: number;
		repoName: string;
		categoryId: string;
	}
): Promise<{ success: boolean; data: schema.labelType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		installation_id: data.installationId,
		repo_id: data.repoId,
		repo_name: data.repoName,
		category_id: data.categoryId,
	};

	const result = await fetch(
		`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/connections/github/sync-repo`,
		{
			method: "POST",
			body: JSON.stringify(payload),
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include", // 👈 ensures cookies/session are sent
		}
	).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to add sync repo");
		}
		return json;
	});

	return result;
}
