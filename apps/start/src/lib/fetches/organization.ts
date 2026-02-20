import type { schema, TeamPermissions } from "@repo/database";

const API_URL = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

export interface CreateOrganizationData {
	name: string;
	slug: string;
	description?: string;
}

export interface UpdateOrganizationData {
	name: string;
	slug: string;
	logo?: string;
	bannerImg?: string;
	description?: string;
}

/**
 * Calls the `/admin/organization/create` API to create a new organization.
 *
 * @param data - The organization data to create.
 * @returns A promise resolving to the creation result.
 */
export async function createOrganizationAction(data: CreateOrganizationData): Promise<{
	success: boolean;
	data?: schema.organizationType;
	error?: string;
}> {
	console.info("Creating organization", { data });
	const result = await fetch(`${API_URL}/v1/admin/organization/create`, {
		method: "POST",
		body: JSON.stringify(data),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (e) => await e.json());
	if (!result.success) {
		console.error("Failed to create organization", {
			error: result.error,
		});
	}
	return result;
}

/**
 * Calls the `/admin/organization/update` API to update an organization's details.
 *
 * @param organizationId - The ID of the organization to update.
 * @param data - The properties of the organization to update.
 * @param wsClientId - The WebSocket client ID (used to push broadcast updates).
 * @returns A promise resolving to the update result.
 */
export async function updateOrganizationAction(
	organizationId: string,
	data: UpdateOrganizationData,
	wsClientId: string
): Promise<{
	success: boolean;
	data: schema.organizationType;
	error?: string;
}> {
	console.info("Updating organization", { organizationId, data });
	const result = await fetch(`${API_URL}/v1/admin/organization/update`, {
		method: "POST",
		body: JSON.stringify({
			org_id: organizationId,
			wsClientId,
			data: data,
		}),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (e) => await e.json());
	if (!result.success) {
		console.error("Failed to update organization", {
			error: result.error,
			organizationId,
		});
	}
	return result;
}

/**
 * Calls the `/admin/organization/{orgId}/logo` API to upload an organization's logo.
 *
 * @param organizationId - The ID of the organization.
 * @param file - The logo file to upload.
 * @param old - The URL of the logo file being replaced, or null if uploading for the first time.
 */
export async function uploadOrganizationLogo(
	organizationId: string,
	file: File,
	old: string | undefined | null
): Promise<{
	success: boolean;
	image: string;
	orgId: string;
	originalName: string;
}> {
	const formData = new FormData();
	formData.append("file", file);

	const res = await fetch(`${API_URL}/v1/admin/organization/${organizationId}/logo`, {
		method: "PUT",
		body: formData,
		credentials: "include",
		headers: {
			"X-old-file": old || "",
		},
	});

	if (!res.ok) {
		throw new Error("Logo upload failed");
	}

	return res.json();
}

/**
 * Calls the `/admin/organization/{orgId}/banner` API to upload an organization's banner image.
 *
 * @param organizationId - The ID of the organization.
 * @param file - The banner image file to upload.
 * @param old - The URL of the previous banner, or null if adding a new one.
 */
export async function uploadOrganizationBanner(
	organizationId: string,
	file: File,
	old: string | undefined | null
): Promise<{
	success: boolean;
	image: string;
	orgId: string;
	originalName: string;
}> {
	const formData = new FormData();
	formData.append("file", file);

	const res = await fetch(`${API_URL}/v1/admin/organization/${organizationId}/banner`, {
		method: "PUT",
		body: formData,
		credentials: "include",
		headers: {
			"X-old-file": old || "",
		},
	});

	if (!res.ok) {
		throw new Error("Banner upload failed");
	}

	return res.json();
}

/**
 * Handles accepting or denying an organization invitation.
 *
 * @param invite - The invitation record object.
 * @param type - The action to perform: "accept" or "deny".
 */
export async function inviteAction(
	invite: schema.inviteType,
	type: "accept" | "deny"
): Promise<{
	success: boolean;
	error?: string;
}> {
	console.info("Inviting organization member", { invite, type });
	const result = await fetch(`${API_URL}/v1/admin/invite`, {
		method: "POST",
		body: JSON.stringify({ invite, type }),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (e) => await e.json());
	if (!result.success) {
		console.error("Failed to invite member", {
			error: result.error,
			invite,
			type,
		});
		return {
			success: false,
			error: result.error,
		};
	}
	console.info("Invite accepted", { invite, type });
	return {
		success: true,
	};
}

/**
 * Invites one or more users to join an organization.
 *
 * @param organizationId - The ID of the organization to send invitations for.
 * @param emails - An array of email addresses to invite.
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
	console.info("Inviting organization members", { organizationId });

	try {
		const response = await fetch(`${API_URL}/v1/admin/organization/member`, {
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
			console.error("Failed to invite members", {
				organizationId,
				error: result.error ?? result.errors,
			});
		}

		return result;
	} catch (err) {
		console.error("Unexpected error inviting members", {
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
 * Deletes a member from an organization.
 *
 * @param organizationId - The ID of the organization from which to remove the member.
 * @param userId - The ID of the user to remove from the organization.
 */
export async function deleteOrganizationMemberAction(
	organizationId: string,
	userId: string
): Promise<{
	success: boolean;
	data: schema.OrganizationMemberType;
	error?: string;
}> {
	console.info("Deleting organization member", { organizationId, userId });
	const result = await fetch(`${API_URL}/v1/admin/organization/member`, {
		method: "DELETE",
		body: JSON.stringify({
			org_id: organizationId,
			user_id: userId,
		}),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (e) => await e.json());
	if (!result.success) {
		console.error("Failed to delete organization member", {
			error: result.error,
			organizationId,
		});
	}
	return result;
}

/**
 * Creates new labels in an organization.
 *
 * @param organizationId - The ID of the organization the labels belong to.
 * @param data - The label properties (name, color, visible).
 * @param wsClientId - The WebSocket client ID (for broadcasting updates).
 */
export async function createLabelAction(
	organizationId: string,
	data: {
		name: string;
		color: string;
		visible?: "public" | "private";
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.labelType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		name: data.name,
		color: data.color,
		visible: data.visible,
		wsClientId,
	};

	const result = await fetch(`${API_URL}/v1/admin/organization/create-label`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
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
 * Updates an existing label in an organization.
 *
 * @param organizationId - The ID of the organization the labels belong to.
 * @param data - The label properties to update (id, name, color, visible).
 * @param wsClientId - The WebSocket client ID (for broadcasting updates).
 */
export async function editLabelAction(
	organizationId: string,
	data: {
		id: string;
		name: string;
		color: string;
		visible?: "public" | "private";
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.labelType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		id: data.id,
		name: data.name,
		color: data.color,
		visible: data.visible,
		wsClientId,
	};

	const result = await fetch(`${API_URL}/v1/admin/organization/edit-label`, {
		method: "PATCH",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
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
 * Deletes a label from an organization.
 *
 * @param organizationId - The ID of the organization the labels belong to.
 * @param data - The label properties for deletion (id).
 * @param wsClientId - The WebSocket client ID (for pushing changes).
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

	const result = await fetch(`${API_URL}/v1/admin/organization/delete-label`, {
		method: "DELETE",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
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
 * Creates a saved view in an organization.
 *
 * @param organizationId - The ID of the organization the views belong to.
 * @param data - The view properties (name, slug, logo, value, viewConfig).
 * @param wsClientId - The WebSocket client ID (for pushing changes).
 */
export async function createSavedViewAction(
	organizationId: string,
	data: {
		name: string;
		slug: string;
		logo: string;
		value?: string;
		viewConfig: schema.savedViewType["viewConfig"];
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.savedViewType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		name: data.name,
		slug: data.slug,
		logo: data.logo,
		value: data.value,
		viewConfig: data.viewConfig,
		wsClientId,
	};
	const result = await fetch(`${API_URL}/v1/admin/organization/create-view`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
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
 * Updates a saved view in an organization.
 *
 * @param organizationId - The ID of the organization the views belong to.
 * @param data - The view properties to update.
 * @param wsClientId - The WebSocket client ID (for pushing changes).
 */
export async function updateSavedViewAction(
	organizationId: string,
	data: {
		id: string;
		name?: string;
		slug?: string;
		logo?: string;
		value?: string;
		viewConfig?: schema.savedViewType["viewConfig"];
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.savedViewType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		id: data.id,
		name: data.name,
		slug: data.slug,
		logo: data.logo,
		value: data.value,
		viewConfig: data.viewConfig,
		wsClientId,
	};
	const result = await fetch(`${API_URL}/v1/admin/organization/update-view`, {
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
 * Deletes a saved view from an organization.
 *
 * @param organizationId - The ID of the organization the views belong to.
 * @param data - The view properties for deletion (id).
 * @param wsClientId - The WebSocket client ID (for pushing changes).
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

	const result = await fetch(`${API_URL}/v1/admin/organization/delete-view`, {
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
 * Creates a new category in an organization.
 *
 * @param organizationId - The ID of the organization the categories belong to.
 * @param data - The category properties (name, color, icon).
 * @param wsClientId - The WebSocket client ID (for broadcasting updates).
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

	const result = await fetch(`${API_URL}/v1/admin/organization/create-category`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
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
 * Updates an existing category in an organization.
 *
 * @param organizationId - The ID of the organization the categories belong to.
 * @param data - The category properties to update (id, name, color, icon).
 * @param wsClientId - The WebSocket client ID (used for pushing updates).
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

	const result = await fetch(`${API_URL}/v1/admin/organization/edit-category`, {
		method: "PATCH",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
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
 * Deletes a category in an organization.
 *
 * @param organizationId - The ID of the organization the categories belong to.
 * @param data - The category properties for deletion (id).
 * @param wsClientId - The WebSocket client ID (for pushing changes).
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

	const result = await fetch(`${API_URL}/v1/admin/organization/delete-category`, {
		method: "DELETE",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
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
 * Synchronizes a GitHub repository with an organization's task system.
 *
 * @param organizationId - The unique ID of the organization performing the sync.
 * @param data - Repository sync details (installationId, repoId, repoName, categoryId).
 */
export async function createGithubSyncConnectionAction(
	organizationId: string,
	data: {
		installationId: number;
		repoId: number;
		repoName: string;
		categoryId: string | null;
	}
): Promise<{ success: boolean; data: schema.labelType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		installation_id: data.installationId,
		repo_id: data.repoId,
		repo_name: data.repoName,
		category_id: data.categoryId,
	};

	const result = await fetch(`${API_URL}/v1/admin/organization/connections/github/sync-repo`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to add sync repo");
		}
		return json;
	});

	return result;
}

/**
 * Updates an existing GitHub sync connection.
 *
 * @param organizationId - The unique ID of the organization.
 * @param syncId - The ID of the sync connection to update.
 * @param data - Updated repository sync details.
 */
export async function updateGithubSyncConnectionAction(
	organizationId: string,
	syncId: string,
	data: {
		installationId: number;
		repoId: number;
		repoName: string;
		categoryId: string | null;
	}
): Promise<{
	success: boolean;
	data: schema.labelType[];
	error?: string;
}> {
	const payload = {
		org_id: organizationId,
		sync_id: syncId,
		installation_id: data.installationId,
		repo_id: data.repoId,
		repo_name: data.repoName,
		category_id: data.categoryId,
	};

	const result = await fetch(
		`${API_URL}/v1/admin/organization/connections/github/sync-repo`,
		{
			method: "PATCH",
			body: JSON.stringify(payload),
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
		}
	).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(
				json?.error ||
				"Failed to update sync repo"
			);
		}
		return json;
	});

	return result;
}

/**
 * Deletes an existing GitHub sync connection.
 *
 * @param organizationId - The organization ID.
 * @param syncId - The sync connection ID to delete.
 */
export async function deleteGithubSyncConnectionAction(
	organizationId: string,
	syncId: string
): Promise<{
	success: boolean;
	data?: unknown;
	error?: string;
}> {
	const payload = {
		org_id: organizationId,
		sync_id: syncId,
	};

	const result = await fetch(
		`${API_URL}/v1/admin/organization/connections/github/sync-repo`,
		{
			method: "DELETE",
			body: JSON.stringify(payload),
			headers: {
				"Content-Type":
					"application/json",
			},
			credentials: "include",
		}
	).then(async (res) => {
		const json =
			await res.json();

		if (!res.ok) {
			throw new Error(
				json?.error ||
				"Failed to delete sync connection"
			);
		}

		return json;
	});

	return result;
}

/**
 * Enables or disables an existing GitHub sync connection.
 *
 * @param organizationId - The unique ID of the organization.
 * @param syncId - The ID of the sync connection to toggle.
 * @param enabled - Whether the sync should be enabled (true) or disabled (false).
 *
 * @returns A promise resolving to the API response.
 */
export async function toggleGithubSyncConnectionAction(
	organizationId: string,
	syncId: string,
	enabled: boolean
) {
	return fetch(
		`${API_URL}/v1/admin/organization/connections/github/sync-repo/toggle`,
		{
			method: "PATCH",
			headers: {
				"Content-Type":
					"application/json",
			},
			credentials: "include",
			body: JSON.stringify({
				org_id: organizationId,
				sync_id: syncId,
				enabled,
			}),
		}
	).then(async (res) => {
		const json =
			await res.json();
		if (!res.ok)
			throw new Error(
				json?.error ||
				"Failed to toggle sync"
			);
		return json;
	});
}

/**
 * Creates a new team within an organization.
 * @param organizationId - The ID of the organization to which the team will belong.
 * @param data - The team properties (name, description, permissions).
 * @returns A promise resolving to the creation result.
 */
export async function createOrganizationTeamAction(
	organizationId: string,
	data: {
		name: string;
		description: string;
		permissions: TeamPermissions;
	}
): Promise<{
	success: boolean;
	data: schema.OrganizationTeamType;
	error?: string;
}> {
	const payload = {
		org_id: organizationId,
		name: data.name,
		description: data.description,
		permissions: data.permissions,
	};
	const result = await fetch(`${API_URL}/v1/admin/organization/team`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to create team");
		}
		return json;
	});
	return result;
}

/**
 * Edit a team within an organization.
 * @param organizationId - The ID of the organization to which the team will belong.
 * @param teamId - The ID of the team
 * @param data - The team properties (name, description, permissions).
 * @returns A promise resolving to the edit result.
 */
export async function editOrganizationTeamAction(
	organizationId: string,
	teamId: string,
	data: {
		name: string;
		description: string;
		permissions: TeamPermissions;
	}
): Promise<{
	success: boolean;
	data: schema.OrganizationTeamType;
	error?: string;
}> {
	const payload = {
		org_id: organizationId,
		team_id: teamId,
		name: data.name,
		description: data.description,
		permissions: data.permissions,
	};
	const result = await fetch(`${API_URL}/v1/admin/organization/team`, {
		method: "PATCH",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to edit team");
		}
		return json;
	});
	return result;
}

/**
 * Delete a team within an organization.
 * @param organizationId - The ID of the organization to which the team will belong.
 * @param teamId - The ID of the team
 * @returns A promise resolving to the deletion result.
 */
export async function deleteOrganizationTeamAction(
	organizationId: string,
	teamId: string
): Promise<{
	success: boolean;
	data: schema.OrganizationTeamType;
	error?: string;
}> {
	const payload = {
		org_id: organizationId,
		team_id: teamId,
	};
	const result = await fetch(`${API_URL}/v1/admin/organization/team`, {
		method: "DELETE",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to delete team");
		}
		return json;
	});
	return result;
}

/**
 * Adds a member to a team within an organization.
 * @param organizationId - The ID of the organization.
 * @param teamId - The ID of the team to which the member will be added.
 * @param memberId - The ID of the member to add to the team.
 * @returns A promise resolving to the addition result.
 */
export async function addOrganizationMemberToTeamAction(
	organizationId: string,
	teamId: string,
	memberId: string
): Promise<{
	success: boolean;
	data: schema.OrganizationMemberType;
	error?: string;
}> {
	const payload = {
		org_id: organizationId,
		team_id: teamId,
		member_id: memberId,
	};
	const result = await fetch(`${API_URL}/v1/admin/organization/team-member`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to add member to team");
		}
		return json;
	});
	return result;
}

/**
 * Removes a member from a team within an organization.
 * @param organizationId - The ID of the organization.
 * @param teamId - The ID of the team from which the member will be removed.
 * @param memberId - The ID of the member to remove from the team.
 * @returns A promise resolving to the removal result.
 */
export async function removeOrganizationMemberFromTeamAction(
	organizationId: string,
	teamId: string,
	memberId: string
): Promise<{
	success: boolean;
	data: schema.OrganizationMemberType;
	error?: string;
}> {
	const payload = {
		org_id: organizationId,
		team_id: teamId,
		member_id: memberId,
	};
	const result = await fetch(`${API_URL}/v1/admin/organization/team-member`, {
		method: "DELETE",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to remove member from team");
		}
		return json;
	});
	return result;
}

/**
 * Creates an issue template in an organization.
 *
 * @param organizationId - The ID of the organization the templates belong to.
 * @param data - The template properties.
 * @param wsClientId - The WebSocket client ID (for broadcasting updates).
 */
export async function createIssueTemplateAction(
	organizationId: string,
	data: {
		name: string;
		titlePrefix?: string;
		description?: schema.NodeJSON;
		status?: string;
		priority?: string;
		categoryId?: string;
		labelIds?: string[];
		assigneeIds?: string[];
		releaseId?: string;
		visible?: "public" | "private";
	},
	wsClientId: string
): Promise<{
	success: boolean;
	data: schema.issueTemplateWithRelations[];
	error?: string;
}> {
	const payload = {
		org_id: organizationId,
		name: data.name,
		titlePrefix: data.titlePrefix,
		description: data.description,
		status: data.status,
		priority: data.priority,
		categoryId: data.categoryId,
		labelIds: data.labelIds,
		assigneeIds: data.assigneeIds,
		releaseId: data.releaseId,
		visible: data.visible,
		wsClientId,
	};

	const result = await fetch(`${API_URL}/v1/admin/organization/create-issue-template`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to create issue template");
		}
		return json;
	});

	return result;
}

/**
 * Updates an existing issue template in an organization.
 *
 * @param organizationId - The ID of the organization the templates belong to.
 * @param data - The template properties to update.
 * @param wsClientId - The WebSocket client ID (for broadcasting updates).
 */
export async function editIssueTemplateAction(
	organizationId: string,
	data: {
		id: string;
		name: string;
		titlePrefix?: string;
		description?: schema.NodeJSON;
		status?: string;
		priority?: string;
		categoryId?: string;
		labelIds?: string[];
		assigneeIds?: string[];
		releaseId?: string;
		visible?: "public" | "private";
	},
	wsClientId: string
): Promise<{
	success: boolean;
	data: schema.issueTemplateWithRelations[];
	error?: string;
}> {
	const payload = {
		org_id: organizationId,
		id: data.id,
		name: data.name,
		titlePrefix: data.titlePrefix,
		description: data.description,
		status: data.status,
		priority: data.priority,
		categoryId: data.categoryId,
		labelIds: data.labelIds,
		assigneeIds: data.assigneeIds,
		releaseId: data.releaseId,
		visible: data.visible,
		wsClientId,
	};

	const result = await fetch(`${API_URL}/v1/admin/organization/edit-issue-template`, {
		method: "PATCH",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to edit issue template");
		}
		return json;
	});

	return result;
}

/**
 * Deletes an issue template from an organization.
 *
 * @param organizationId - The ID of the organization the templates belong to.
 * @param data - The template properties for deletion (id).
 * @param wsClientId - The WebSocket client ID (for pushing changes).
 */
export async function deleteIssueTemplateAction(
	organizationId: string,
	data: {
		id: string;
	},
	wsClientId: string
): Promise<{
	success: boolean;
	data: schema.issueTemplateWithRelations[];
	error?: string;
}> {
	const payload = {
		org_id: organizationId,
		id: data.id,
		wsClientId,
	};

	const result = await fetch(`${API_URL}/v1/admin/organization/delete-issue-template`, {
		method: "DELETE",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to delete issue template");
		}
		return json;
	});

	return result;
}
