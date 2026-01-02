import { randomBytes, randomUUID } from "node:crypto";
import {
	addMemberToAdminTeam,
	bootstrapOrganizationAdminTeam,
	db,
	defaultTeamPermissions,
	getLabels,
	getOrganizationMembers,
	hasOrgPermission,
	schema,
	type TeamPermissions,
} from "@repo/database";
import { removeObject, uploadObject } from "@repo/storage";
import { ensureCdnUrl, getFileNameFromUrl } from "@repo/util";
import { getInstallationDetailsWithRepos } from "@repo/util/github/auth";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { broadcast, broadcastByUserId, broadcastPublic, findClientByWsId } from "../ws";
import type { WSBaseMessage } from "../ws/types";
import { apiRouteAdminProjectTask } from "./task";
export const apiRouteAdminOrganization = new Hono<AppEnv>();

// Create a new organization
apiRouteAdminOrganization.post("/create", async (c) => {
	const session = c.get("session");
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "organization.create",
		description: "Create organization requested",
		data: {},
	});
	if (!session?.userId) {
		await recordWideEvent({
			name: "organization.create",
			description: "User not authenticated on organization create",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User not authenticated",
			},
		});
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
	}

	const { name, slug, description } = await c.req.json();

	if (!name || !slug) {
		await recordWideEvent({
			name: "organization.create",
			description: "Validation error for missing name or slug",
			data: {
				type: "ValidationError",
				code: "InvalidRequest",
				message: "Name and slug are required",
			},
		});
		return c.json({ success: false, error: "Name and slug are required" }, 400);
	}

	const existingOrg = await db.query.organization.findFirst({
		where: eq(schema.organization.slug, slug),
	});

	if (existingOrg) {
		await recordWideEvent({
			name: "organization.create",
			description: "Slug already taken",
			data: {
				type: "ValidationError",
				code: "SlugTaken",
				message: "Organization slug is already taken",
			},
		});
		return c.json({ success: false, error: "Organization slug is already taken" }, 400);
	}

	const orgId = randomUUID();

	const [newOrg] = await db
		.insert(schema.organization)
		.values({
			id: orgId,
			name,
			slug,
			description: description || "",
		})
		.returning();

	if (!newOrg) {
		await recordWideEvent({
			name: "organization.create",
			description: "Failed to create organization",
			data: {
				type: "DatabaseError",
				code: "OrgCreationFailed",
			},
		});
		return c.json({ success: false, error: "Failed to create organization" }, 500);
	}

	const [membership] = await db
		.insert(schema.member)
		.values({
			id: randomUUID(),
			userId: session.userId,
			organizationId: orgId,
		})
		.returning();

	if (!membership) {
		await recordWideEvent({
			name: "organization.create",
			description: "Failed to create membership, rolling back org",
			data: {
				type: "DatabaseError",
				code: "MembershipCreationFailed",
			},
		});
		await db.delete(schema.organization).where(eq(schema.organization.id, orgId));
		return c.json({ success: false, error: "Failed to create organization membership" }, 500);
	}

	// Create default Administrators team and add the creator to it
	try {
		await bootstrapOrganizationAdminTeam(orgId);
	} catch (err) {
		console.error("Failed to create default admin team:", err);
		// Don't fail org creation if admin team creation fails
	}

	await recordWideEvent({
		name: "organization.create",
		description: "Organization successfully created",
		data: {
			organizationId: orgId,
			createdByUserId: session.userId,
		},
	});
	return c.json({
		success: true,
		data: {
			...newOrg,
			logo: newOrg.logo ? ensureCdnUrl(newOrg.logo) : null,
			bannerImg: newOrg.bannerImg ? ensureCdnUrl(newOrg.bannerImg) : null,
		},
	});
});

// Update organization details
apiRouteAdminOrganization.post("/update", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "organization.update",
		description: "Update organization requested",
		data: {},
	});
	const { org_id, wsClientId, data } = await c.req.json();
	const session = c.get("session");
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "admin.manageMembers");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "organization.update",
			description: "Unauthorized update attempt",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to update organization",
			},
		});
		return c.json({ error: "You don’t have permission to do that." }, 401);
	}
	if (data.slug) {
		const [existing] = await db
			.select()
			.from(schema.organization)
			.where(eq(schema.organization.slug, data.slug))
			.limit(1);
		if (existing && existing.id !== org_id) {
			return c.json({ error: "Slug already in use by another organization." }, 400);
		}
	}
	const [result] = await db
		.update(schema.organization)
		.set({
			...data,
			logo: data.logo && `organization/${org_id}/${getFileNameFromUrl(data.logo)}`,
			bannerImg: data.bannerImg && `organization/${org_id}/${getFileNameFromUrl(data.bannerImg)}`,
			updatedAt: new Date(),
		})
		.where(eq(schema.organization.id, org_id))
		.returning();
	if (result) {
		const found = findClientByWsId(wsClientId);
		const dataMsg = {
			type: "UPDATE_ORG" as WSBaseMessage["type"],
			data: {
				...result,
				logo: result.logo ? ensureCdnUrl(result.logo) : null,
				bannerImg: result.bannerImg ? ensureCdnUrl(result.bannerImg) : null,
			},
		};
		broadcast(org_id, "admin", dataMsg, found?.socket);
		broadcastPublic(org_id, {
			...dataMsg,
			data: { ...dataMsg.data, privateId: null },
		});
		const members = await getOrganizationMembers(org_id);
		members.forEach((member) => {
			broadcastByUserId(member.userId, "", org_id, dataMsg, "");
		});
		await recordWideEvent({
			name: "organization.update",
			description: "Organization updated successfully",
			data: {
				organizationId: org_id,
				updatedByUserId: session?.userId || "",
			},
		});
		return c.json({
			success: true,
			data: {
				...result,
				logo: result.logo ? ensureCdnUrl(result.logo) : null,
				bannerImg: result.bannerImg ? ensureCdnUrl(result.bannerImg) : null,
			},
		});
	}
});

// Upload organization logo
apiRouteAdminOrganization.put("/:orgId/logo", async (c) => {
	try {
		const recordWideEvent = c.get("recordWideEvent");
		await recordWideEvent({
			name: "organization.logoUpload",
			description: "Organization logo upload requested",
			data: {},
		});
		const session = c.get("session");
		const orgId = c.req.param("orgId");
		const oldLogo = c.req.header("X-old-file");

		const isAuthorized = await hasOrgPermission(session?.userId || "", orgId, "admin.manageMembers");
		if (!isAuthorized) {
			await recordWideEvent({
				name: "organization.logoUpload",
				description: "User not authorized to upload organization logo",
				data: {
					type: "AuthorizationError",
					code: "Unauthorized",
					message: "User does not have permission to upload organization logo",
				},
			});
			return c.json({ error: "You don’t have permission to do that." }, 401);
		}

		// 2. Parse multipart body
		const body = await c.req.parseBody();
		const file = body.file;
		if (!file || !(file instanceof File)) {
			await recordWideEvent({
				name: "organization.logoUpload",
				description: "No file uploaded for organization logo",
				data: {
					type: "ValidationError",
					code: "NoFileUploaded",
					message: "No file uploaded for organization logo",
				},
			});
			return c.text("No file uploaded", 400);
		}

		const buffer = Buffer.from(await file.arrayBuffer());

		const ext = file.name.split(".").pop() || file.type.split("/")[1] || "png";
		const objectName = `/logo.${ext}`;
		if (oldLogo) {
			await recordWideEvent({
				name: "organization.logoUpload",
				description: "Previous logo removed before new upload",
				data: {
					organizationId: orgId,
					removedByUserId: session?.userId || "",
				},
			});
			await removeObject(`organization/${orgId}/${getFileNameFromUrl(oldLogo)}`);
		}

		const imagelogo = await uploadObject(objectName, buffer, `organization/${orgId}`, {
			"Content-Type": file.type || "application/octet-stream",
			originalName: objectName,
		});

		await recordWideEvent({
			name: "organization.logoUpload",
			description: "Organization logo uploaded successfully",
			data: {
				organizationId: orgId,
				uploadedByUserId: session?.userId || "",
			},
		});

		return c.json({
			success: true,
			orgId,
			originalName: file.name,
			image: imagelogo,
		});
	} catch (err: any) {
		console.error("Upload failed:", err.message);
		const recordWideEvent = c.get("recordWideEvent");
		await recordWideEvent({
			name: "organization.logoUpload",
			description: "Organization logo upload failed",
			data: { error: err.message },
		});
		return c.text("Upload failed", 500);
	}
});

// Upload organization banner
apiRouteAdminOrganization.put("/:orgId/banner", async (c) => {
	try {
		const recordWideEvent = c.get("recordWideEvent");
		await recordWideEvent({
			name: "organization.bannerUpload",
			description: "Organization banner upload requested",
			data: {},
		});
		const session = c.get("session");
		const orgId = c.req.param("orgId");
		const oldBanner = c.req.header("X-old-file");

		const isAuthorized = await hasOrgPermission(session?.userId || "", orgId, "admin.manageMembers");
		if (!isAuthorized) {
			await recordWideEvent({
				name: "organization.bannerUpload",
				description: "User not authorized to upload organization banner",
				data: {
					type: "AuthorizationError",
					code: "Unauthorized",
					message: "User does not have permission to upload organization banner",
				},
			});
			return c.json({ error: "You don’t have permission to do that." }, 401);
		}

		const body = await c.req.parseBody();
		const file = body.file;
		if (!file || !(file instanceof File)) {
			await recordWideEvent({
				name: "organization.bannerUpload",
				description: "No file uploaded for organization banner",
				data: {
					type: "ValidationError",
					code: "NoFileUploaded",
					message: "No file uploaded for organization banner",
				},
			});
			return c.text("No file uploaded", 400);
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const ext = file.name.split(".").pop() || file.type.split("/")[1] || "png";
		const objectName = `banner.${ext}`;

		if (oldBanner) {
			await recordWideEvent({
				name: "organization.bannerUpload",
				description: "Previous banner removed before new upload",
				data: {
					organizationId: orgId,
					removedByUserId: session?.userId || "",
				},
			});
			await removeObject(`organization/${orgId}/${getFileNameFromUrl(oldBanner)}`);
		}

		const imagebanner = await uploadObject(objectName, buffer, `organization/${orgId}`, {
			"Content-Type": file.type || "application/octet-stream",
			originalName: objectName,
		});

		await recordWideEvent({
			name: "organization.bannerUpload",
			description: "Organization banner uploaded successfully",
			data: {
				organizationId: orgId,
				uploadedByUserId: session?.userId || "",
			},
		});

		return c.json({
			success: true,
			orgId,
			originalName: file.name,
			image: imagebanner,
		});
	} catch (err: any) {
		console.error("Upload failed:", err.message);
		const recordWideEvent = c.get("recordWideEvent");
		await recordWideEvent({
			name: "organization.bannerUpload",
			description: "Organization banner upload failed",
			data: { error: err.message },
		});
		return c.text("Upload failed", 500);
	}
});

// Label management
// Create label with name and color
apiRouteAdminOrganization.post("/create-label", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "label.create",
		description: "Create label requested",
		data: {},
	});

	const session = c.get("session");
	const { org_id, wsClientId, name, color } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "content.manageLabels");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "label.create",
			description: "Unauthorized to create labels",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to create labels",
			},
		});
		// wording fix: clearer explanation
		return c.json({ success: false, error: "You don’t have permission to create labels." }, 401);
	}

	const [created] = await db
		.insert(schema.label)
		.values({
			organizationId: org_id,
			name,
			color: color ?? "#cccccc",
		})
		.returning();

	if (!created) {
		await recordWideEvent({
			name: "label.create",
			description: "Database error creating label",
			data: {
				type: "DatabaseError",
				code: "LabelCreationFailed",
				message: "Failed to create label",
			},
		});
		return c.json({ success: false, error: "Failed to create label." }, 500);
	}

	const labels = await getLabels(org_id);
	const found = findClientByWsId(wsClientId);
	const data = {
		type: "UPDATE_LABELS" as WSBaseMessage["type"],
		data: labels,
	};
	broadcast(org_id, "admin", data, found?.socket);
	broadcastPublic(org_id, { ...data, data: data });
	const members = await getOrganizationMembers(org_id);
	members.forEach((member) => {
		broadcastByUserId(member.userId, wsClientId, org_id, data);
	});

	await recordWideEvent({
		name: "label.create",
		description: "Label created successfully",
		data: {
			organizationId: org_id,
			labelId: created.id,
			createdByUserId: session?.userId || "",
		},
	});

	return c.json({
		success: true,
		data: labels,
	});
});

// Edit label name and color
apiRouteAdminOrganization.patch("/edit-label", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "label.edit",
		description: "Edit label requested",
		data: {},
	});

	const session = c.get("session");
	const { org_id, wsClientId, id, name, color } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "content.manageLabels");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "label.edit",
			description: "Unauthorized to edit labels",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to edit labels",
			},
		});
		return c.json({ success: false, error: "You don’t have permission to edit labels." }, 401);
	}

	const [edit] = await db
		.update(schema.label)
		.set({
			name,
			color: color ?? "hsla(0, 0%, 0%, 1)",
		})
		.where(and(eq(schema.label.id, id), eq(schema.label.organizationId, org_id)))
		.returning();

	if (!edit) {
		await recordWideEvent({
			name: "label.edit",
			description: "Database error editing label",
			data: {
				type: "DatabaseError",
				code: "LabelEditFailed",
				message: "Failed to edit label",
			},
		});
		return c.json({ success: false, error: "Failed to edit label." }, 500);
	}

	const labels = await getLabels(org_id);
	const found = findClientByWsId(wsClientId);
	const data = {
		type: "UPDATE_LABELS" as WSBaseMessage["type"],
		data: labels,
	};
	broadcast(org_id, "admin", data, found?.socket);
	broadcastPublic(org_id, { ...data, data: data });
	const members = await getOrganizationMembers(org_id);
	members.forEach((member) => {
		broadcastByUserId(member.userId, wsClientId, org_id, data);
	});

	await recordWideEvent({
		name: "label.edit",
		description: "Label edited successfully",
		data: {
			organizationId: org_id,
			labelId: edit.id,
			editedByUserId: session?.userId || "",
		},
	});

	return c.json({
		success: true,
		data: labels,
	});
});

// Delete label by label ID
apiRouteAdminOrganization.delete("/delete-label", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "label.delete",
		description: "Delete label requested",
		data: {},
	});

	const session = c.get("session");
	const { org_id, wsClientId, id } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "content.manageLabels");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "label.delete",
			description: "Unauthorized to delete labels",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to delete labels",
			},
		});
		return c.json({ success: false, error: "You don’t have permission to delete labels." }, 401);
	}

	const [removed] = await db
		.delete(schema.label)
		.where(and(eq(schema.label.id, id), eq(schema.label.organizationId, org_id), eq(schema.label.id, id)))
		.returning();

	if (!removed) {
		await recordWideEvent({
			name: "label.delete",
			description: "Database error deleting label",
			data: {
				type: "DatabaseError",
				code: "LabelDeletionFailed",
				message: "Failed to remove label",
			},
		});
		return c.json({ success: false, error: "Failed to remove label." }, 500);
	}

	const labels = await getLabels(org_id);
	const found = findClientByWsId(wsClientId);
	const data = {
		type: "UPDATE_LABELS" as WSBaseMessage["type"],
		data: labels,
	};
	broadcast(org_id, "admin", data, found?.socket);
	broadcastPublic(org_id, { ...data, data: data });
	const members = await getOrganizationMembers(org_id);
	members.forEach((member) => {
		broadcastByUserId(member.userId, wsClientId, org_id, data);
	});

	await recordWideEvent({
		name: "label.delete",
		description: "Label deleted successfully",
		data: {
			organizationId: org_id,
			labelId: removed.id,
			deletedByUserId: session?.userId || "",
		},
	});

	return c.json({
		success: true,
		data: labels,
	});
});

// Category management
// Create category with name, color, and icon
apiRouteAdminOrganization.post("/create-category", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "category.create",
		description: "Create category requested",
		data: {},
	});

	const session = c.get("session");
	const { org_id, wsClientId, name, color, icon } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "content.manageCategories");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "category.create",
			description: "Unauthorized to create categories",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to create categories",
			},
		});
		return c.json(
			{
				success: false,
				error: "You don’t have permission to create categories.",
			},
			401
		);
	}

	const [created] = await db
		.insert(schema.category)
		.values({
			organizationId: org_id,
			name,
			color: color ?? "hsla(0, 0%, 0%, 1)",
			icon,
		})
		.returning();

	if (!created) {
		await recordWideEvent({
			name: "category.create",
			description: "Database error creating category",
			data: {
				type: "DatabaseError",
				code: "CategoryCreationFailed",
				message: "Failed to create category",
			},
		});
		return c.json({ success: false, error: "Failed to create category." }, 500);
	}

	const categories = await db.query.category.findMany({
		where: (category) => eq(category.organizationId, org_id),
	});
	const found = findClientByWsId(wsClientId);
	const data = {
		type: "UPDATE_CATEGORIES" as WSBaseMessage["type"],
		data: categories,
	};
	broadcast(org_id, "admin", data, found?.socket);
	broadcastPublic(org_id, { ...data, data: data });
	const members = await getOrganizationMembers(org_id);
	members.forEach((member) => {
		broadcastByUserId(member.userId, wsClientId, org_id, data);
	});

	await recordWideEvent({
		name: "category.create",
		description: "Category created successfully",
		data: {
			organizationId: org_id,
			categoryId: created.id,
			createdByUserId: session?.userId || "",
		},
	});

	return c.json({
		success: true,
		data: categories,
	});
});

// Edit category name, color, and icon
apiRouteAdminOrganization.patch("/edit-category", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "category.edit",
		description: "Edit category requested",
		data: {},
	});

	const session = c.get("session");
	const { org_id, wsClientId, id, name, color, icon } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "content.manageCategories");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "category.edit",
			description: "Unauthorized to edit categories",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to edit categories",
			},
		});
		return c.json(
			{
				success: false,
				error: "You don’t have permission to edit categories.",
			},
			401
		);
	}

	const [edit] = await db
		.update(schema.category)
		.set({
			name,
			color: color ?? "hsla(0, 0%, 0%, 1)",
			icon,
		})
		.where(and(eq(schema.category.id, id), eq(schema.category.organizationId, org_id)))
		.returning();

	if (!edit) {
		await recordWideEvent({
			name: "category.edit",
			description: "Database error editing category",
			data: {
				type: "DatabaseError",
				code: "CategoryEditFailed",
				message: "Failed to edit category",
			},
		});
		return c.json({ success: false, error: "Failed to edit category." }, 500);
	}

	const categories = await db.query.category.findMany({
		where: (category) => eq(category.organizationId, org_id),
	});
	const found = findClientByWsId(wsClientId);
	const data = {
		type: "UPDATE_CATEGORIES" as WSBaseMessage["type"],
		data: categories,
	};
	broadcast(org_id, "admin", data, found?.socket);
	broadcastPublic(org_id, { ...data, data: data });
	const members = await getOrganizationMembers(org_id);
	members.forEach((member) => {
		broadcastByUserId(member.userId, wsClientId, org_id, data);
	});

	await recordWideEvent({
		name: "category.edit",
		description: "Category edited successfully",
		data: {
			organizationId: org_id,
			categoryId: edit.id,
			editedByUserId: session?.userId || "",
		},
	});

	return c.json({
		success: true,
		data: categories,
	});
});

// Delete category by category ID
apiRouteAdminOrganization.delete("/delete-category", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "category.delete",
		description: "Delete category requested",
		data: {},
	});

	const session = c.get("session");
	const { org_id, wsClientId, id } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "content.manageCategories");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "category.delete",
			description: "Unauthorized to delete categories",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to delete categories",
			},
		});
		return c.json(
			{
				success: false,
				error: "You don’t have permission to delete categories.",
			},
			401
		);
	}

	const [removed] = await db
		.delete(schema.category)
		.where(and(eq(schema.category.id, id), eq(schema.category.organizationId, org_id), eq(schema.category.id, id)))
		.returning();

	if (!removed) {
		await recordWideEvent({
			name: "category.delete",
			description: "Database error deleting category",
			data: {
				type: "DatabaseError",
				code: "CategoryDeletionFailed",
				message: "Failed to remove category",
			},
		});
		return c.json({ success: false, error: "Failed to remove category." }, 500);
	}

	const categories = await db.query.category.findMany({
		where: (category) => eq(category.organizationId, org_id),
	});
	const found = findClientByWsId(wsClientId);
	const data = {
		type: "UPDATE_CATEGORIES" as WSBaseMessage["type"],
		data: categories,
	};
	broadcast(org_id, "admin", data, found?.socket);
	broadcastPublic(org_id, { ...data, data: data });
	const members = await getOrganizationMembers(org_id);
	members.forEach((member) => {
		broadcastByUserId(member.userId, wsClientId, org_id, data);
	});

	await recordWideEvent({
		name: "category.delete",
		description: "Category deleted successfully",
		data: {
			organizationId: org_id,
			categoryId: removed.id,
			deletedByUserId: session?.userId || "",
		},
	});

	return c.json({
		success: true,
		data: categories,
	});
});

// Saved View management
// Create saved view with name and filter params
apiRouteAdminOrganization.post("/create-view", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "savedView.create",
		description: "Create saved view requested",
		data: {},
	});

	const session = c.get("session");
	const { org_id, wsClientId, name, value, logo, slug, viewConfig } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "admin.manageMembers");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "savedView.create",
			description: "Unauthorized to create saved views",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to create saved views",
			},
		});
		return c.json(
			{
				success: false,
				error: "You don’t have permission to create saved views.",
			},
			401
		);
	}

	const [view] = await db
		.insert(schema.savedView)
		.values({
			organizationId: org_id,
			createdById: session?.userId,
			name,
			logo,
			slug,
			filterParams: value,
			viewConfig: viewConfig,
		})
		.returning();

	if (!view) {
		await recordWideEvent({
			name: "savedView.create",
			description: "Database error creating saved view",
			data: {
				type: "DatabaseError",
				code: "SavedViewCreationFailed",
				message: "Failed to create saved view",
			},
		});
		return c.json({ success: false, error: "Failed to create view." }, 500);
	}

	const views = await db.query.savedView.findMany({
		where: (view) => eq(view.organizationId, org_id),
	});
	const data = {
		type: "UPDATE_VIEWS" as WSBaseMessage["type"],
		data: views,
	};
	const found = findClientByWsId(wsClientId);
	broadcast(org_id, "admin", data, found?.socket);
	broadcastPublic(org_id, { ...data, data: data });
	const members = await getOrganizationMembers(org_id);
	members.forEach((member) => {
		broadcastByUserId(member.userId, wsClientId, org_id, data);
	});

	await recordWideEvent({
		name: "savedView.create",
		description: "Saved view created successfully",
		data: {
			organizationId: org_id,
			savedViewId: view.id,
			createdByUserId: session?.userId || "",
		},
	});

	return c.json({
		success: true,
		data: views,
	});
});

// Update saved view
apiRouteAdminOrganization.patch("/update-view", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "savedView.update",
		description: "Update saved view requested",
		data: {},
	});

	const session = c.get("session");
	const { org_id, wsClientId, id, name, value, viewConfig, logo, slug } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "admin.manageMembers");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "savedView.update",
			description: "Unauthorized to update saved views",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to update saved views",
			},
		});
		return c.json(
			{
				success: false,
				error: "You don’t have permission to update saved views.",
			},
			401
		);
	}

	const [view] = await db
		.update(schema.savedView)
		.set({
			name,
			slug,
			logo,
			filterParams: value,
			viewConfig: viewConfig,
			updatedAt: new Date(),
		})
		.where(and(eq(schema.savedView.id, id), eq(schema.savedView.organizationId, org_id)))
		.returning();

	if (!view) {
		await recordWideEvent({
			name: "savedView.update",
			description: "Database error updating saved view",
			data: {
				type: "DatabaseError",
				code: "SavedViewUpdateFailed",
				message: "Failed to update saved view",
			},
		});
		return c.json({ success: false, error: "Failed to update view." }, 500);
	}

	const views = await db.query.savedView.findMany({
		where: (view) => eq(view.organizationId, org_id),
	});
	const data = {
		type: "UPDATE_VIEWS" as WSBaseMessage["type"],
		data: views,
	};
	const found = findClientByWsId(wsClientId);
	broadcast(org_id, "admin", data, found?.socket);
	broadcastPublic(org_id, { ...data, data: data });
	const members = await getOrganizationMembers(org_id);
	members.forEach((member) => {
		broadcastByUserId(member.userId, wsClientId, org_id, data);
	});

	await recordWideEvent({
		name: "savedView.update",
		description: "Saved view updated successfully",
		data: {
			organizationId: org_id,
			savedViewId: view.id,
			updatedByUserId: session?.userId || "",
		},
	});

	return c.json({
		success: true,
		data: views,
	});
});

// Delete saved view
apiRouteAdminOrganization.delete("/delete-view", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "savedView.delete",
		description: "Delete saved view requested",
		data: {},
	});

	const session = c.get("session");
	const { org_id, wsClientId, id } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "admin.manageMembers");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "savedView.delete",
			description: "Unauthorized to delete saved views",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to delete saved views",
			},
		});
		return c.json(
			{
				success: false,
				error: "You don’t have permission to delete saved views.",
			},
			401
		);
	}

	const [removed] = await db
		.delete(schema.savedView)
		.where(and(eq(schema.savedView.id, id), eq(schema.savedView.organizationId, org_id)))
		.returning();

	if (!removed) {
		await recordWideEvent({
			name: "savedView.delete",
			description: "Database error deleting saved view",
			data: {
				type: "DatabaseError",
				code: "SavedViewDeletionFailed",
				message: "Failed to remove saved view",
			},
		});
		return c.json({ success: false, error: "Failed to remove view." }, 500);
	}

	const views = await db.query.savedView.findMany({
		where: (view) => eq(view.organizationId, org_id),
	});
	const data = {
		type: "UPDATE_VIEWS" as WSBaseMessage["type"],
		data: views,
	};
	const found = findClientByWsId(wsClientId);
	broadcast(org_id, "admin", data, found?.socket);
	broadcastPublic(org_id, { ...data, data: data });
	const members = await getOrganizationMembers(org_id);
	members.forEach((member) => {
		broadcastByUserId(member.userId, wsClientId, org_id, data);
	});

	await recordWideEvent({
		name: "savedView.delete",
		description: "Saved view deleted successfully",
		data: {
			organizationId: org_id,
			savedViewId: removed.id,
			deletedByUserId: session?.userId || "",
		},
	});

	return c.json({
		success: true,
		data: views,
	});
});

apiRouteAdminOrganization.post("/connections/github/sync-repo", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "github.syncRepo",
		description: "Sync GitHub repository requested",
		data: {},
	});

	const session = c.get("session");
	const { org_id, repo_id, repo_name, installation_id, category_id } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "admin.administrator");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "github.syncRepo",
			description: "Unauthorized to sync GitHub repositories",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to sync GitHub repositories",
			},
		});
		return c.json(
			{
				success: false,
				error: "You don’t have permission to sync repositories.",
			},
			401
		);
	}

	const found = await db.query.githubRepository.findFirst({
		where: and(
			eq(schema.githubRepository.installationId, installation_id),
			eq(schema.githubRepository.repoId, repo_id),
			eq(schema.githubRepository.organizationId, org_id),
			eq(schema.githubRepository.categoryId, category_id)
		),
	});

	if (found) {
		await recordWideEvent({
			name: "github.syncRepo",
			description: "Repository already synced with this organization",
			data: {
				type: "ValidationError",
				code: "RepoAlreadySynced",
				message: "Repository is already synced with this organization",
			},
		});
		return c.json({ success: false, error: "Repository already synced." }, 400);
	}

	const result = await db.insert(schema.githubRepository).values({
		id: crypto.randomUUID(),
		installationId: installation_id,
		repoId: repo_id,
		repoName: repo_name,
		organizationId: org_id,
		categoryId: category_id,
		userId: session?.userId || "",
	});

	await recordWideEvent({
		name: "github.syncRepo",
		description: "GitHub repository synced successfully",
		data: {
			organizationId: org_id,
			repoId: repo_id,
			syncedByUserId: session?.userId || "",
		},
	});

	return c.json({
		success: true,
		data: result,
	});
});

// team member routes

apiRouteAdminOrganization.post("/member", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "member.invite",
		description: "Invite members requested",
		data: {},
	});

	const session = c.get("session");
	const { org_id, emails }: { org_id: string; emails: string[] } = await c.req.json();

	// --- Permissions ---
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "admin.administrator");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "member.invite",
			description: "Unauthorized to invite members",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to invite members",
			},
		});
		return c.json({ success: false, error: "You don’t have permission to invite members." }, 401);
	}

	// biome-ignore lint/suspicious/noExplicitAny: <any>
	const invites: any[] = [];
	const failedEmails: string[] = [];

	for (const email of emails) {
		try {
			// Find existing user if any
			const user = await db.query.user.findFirst({
				where: (usr) => eq(usr.email, email),
			});

			// Already exists as member?
			const existingMember = user
				? await db.query.member.findFirst({
						where: and(eq(schema.member.organizationId, org_id), eq(schema.member.userId, user.id)),
					})
				: null;

			if (existingMember) continue;

			// Already invited?
			const existingInvite = await db.query.invite.findFirst({
				where: and(eq(schema.invite.organizationId, org_id), eq(schema.invite.email, email)),
			});

			if (existingInvite) continue;

			// Generate secure invite code
			const inviteCode = randomBytes(12).toString("hex");

			const [newInvite] = await db
				.insert(schema.invite)
				.values({
					id: randomBytes(8).toString("hex"),
					organizationId: org_id,
					email,
					userId: user?.id ?? null,
					invitedById: session?.userId || "",
					status: "pending",
					role: "user",
					inviteCode,
					expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
				})
				.returning();

			invites.push(newInvite);
		} catch (err) {
			console.error("Failed to invite email:", email, err);
			failedEmails.push(email);
		}
	}

	await recordWideEvent({
		name: "member.invite",
		description: "Member invites processed",
		data: {
			organizationId: org_id,
			invitedByUserId: session?.userId || "",
			numberOfInvites: invites.length,
		},
	});

	return c.json({
		success: true,
		invites,
		...(failedEmails.length > 0 && { errors: failedEmails }),
	});
});

apiRouteAdminOrganization.delete("/member", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "member.remove",
		description: "Remove member requested",
		data: {},
	});

	const session = c.get("session");
	const { org_id, user_id } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "admin.administrator");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "member.remove",
			description: "Unauthorized to remove members",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to remove members",
			},
		});
		return c.json({ success: false, error: "You don’t have permission to remove members." }, 401);
	}
	const [removed] = await db
		.delete(schema.member)
		.where(and(eq(schema.member.organizationId, org_id), eq(schema.member.userId, user_id)))
		.returning();
	if (!removed) {
		await recordWideEvent({
			name: "member.remove",
			description: "Database error removing member",
			data: {
				type: "DatabaseError",
				code: "MemberRemovalFailed",
				message: "Failed to remove member",
			},
		});
		return c.json({ success: false, error: "Failed to remove member." }, 500);
	}

	broadcastByUserId(user_id, "", org_id, {
		type: "MEMBER_ACTIONS",
		data: { orgId: org_id, userId: user_id, action: "REMOVED" },
	});

	await recordWideEvent({
		name: "member.remove",
		description: "Member removed successfully",
		data: {
			organizationId: org_id,
			removedUserId: user_id,
			removedByUserId: session?.userId || "",
		},
	});

	return c.json({
		success: true,
	});
});

// Get GitHub connection details
apiRouteAdminOrganization.get("/:orgId/connections/github", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "github.connections.fetch",
		description: "Fetch GitHub connections requested",
		data: {},
	});

	const orgId = c.req.param("orgId");
	const session = c.get("session");
	const isAuthorized = await hasOrgPermission(session?.userId || "", orgId, "admin.administrator");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "github.connections.fetch",
			description: "Unauthorized to fetch GitHub connections",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to fetch GitHub connections",
			},
		});
		return c.json({ error: "You don’t have permission to fetch connections." }, 401);
	}

	// Step 1: Fetch installation record
	const githubInstall = await db.query.githubInstallation.findFirst({
		where: eq(schema.githubInstallation.organizationId, orgId),
		with: { user: true },
	});

	let githubInfo = null;
	if (githubInstall?.installationId) {
		githubInfo = await getInstallationDetailsWithRepos(githubInstall);
	}

	// Step 3: Load synced repos
	const githubConnectionsReq = await db.query.githubRepository.findMany({
		where: and(
			eq(schema.githubRepository.organizationId, orgId),
			eq(schema.githubRepository.installationId, githubInfo?.installationId ?? -1)
		),
	});

	const githubConnections = githubConnectionsReq.map((conn) => ({
		...conn,
		repoName: githubInfo?.repositories.find((r) => r.id === conn.repoId)?.full_name || "Unknown repo",
		avatarUrl: githubInfo?.account?.avatar_url,
	}));

	await recordWideEvent({
		name: "github.connections.fetch",
		description: "GitHub connections fetched successfully",
		data: {
			organizationId: orgId,
			fetchedByUserId: session?.userId || "",
			numberOfConnections: githubConnections.length,
		},
	});

	return c.json({
		success: true,
		data: {
			githubInfo,
			githubConnections,
		},
	});
});

// Teams
apiRouteAdminOrganization.post("/team", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "team.create",
		description: "Create team requested",
		data: {},
	});

	const session = c.get("session");
	const { org_id, name, description, permissions } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "admin.manageTeams");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "team.create",
			description: "Unauthorized to create teams",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to create teams",
			},
		});
		return c.json({ success: false, error: "You don’t have permission to create teams." }, 401);
	}

	// Merge provided permissions with defaults
	const teamPermissions: TeamPermissions = permissions
		? {
				admin: { ...defaultTeamPermissions.admin, ...permissions.admin },
				content: { ...defaultTeamPermissions.content, ...permissions.content },
				tasks: { ...defaultTeamPermissions.tasks, ...permissions.tasks },
				moderation: { ...defaultTeamPermissions.moderation, ...permissions.moderation },
			}
		: defaultTeamPermissions;

	const [team] = await db
		.insert(schema.team)
		.values({
			id: crypto.randomUUID(),
			organizationId: org_id,
			name,
			description,
			permissions: teamPermissions,
		})
		.returning();

	if (!team) {
		await recordWideEvent({
			name: "team.create",
			description: "Database error creating team",
			data: {
				type: "DatabaseError",
				code: "TeamCreationFailed",
				message: "Failed to create team",
			},
		});
		return c.json({ success: false, error: "Failed to create team." }, 500);
	}

	await recordWideEvent({
		name: "team.create",
		description: "Team created successfully",
		data: {
			organizationId: org_id,
			teamId: team.id,
			createdByUserId: session?.userId || "",
		},
	});

	return c.json({
		success: true,
		data: team,
	});
});

apiRouteAdminOrganization.patch("/team", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "team.edit",
		description: "Edit team requested",
		data: {},
	});

	const session = c.get("session");
	const { org_id, team_id, name, description, permissions } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "admin.manageTeams");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "team.edit",
			description: "Unauthorized to edit teams",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to edit teams",
			},
		});
		return c.json({ success: false, error: "You don’t have permission to edit teams." }, 401);
	}

	// Merge provided permissions with defaults
	const teamPermissions: TeamPermissions = permissions
		? {
				admin: { ...defaultTeamPermissions.admin, ...permissions.admin },
				content: { ...defaultTeamPermissions.content, ...permissions.content },
				tasks: { ...defaultTeamPermissions.tasks, ...permissions.tasks },
				moderation: { ...defaultTeamPermissions.moderation, ...permissions.moderation },
			}
		: defaultTeamPermissions;

	const [team] = await db
		.update(schema.team)
		.set({
			name,
			description,
			permissions: teamPermissions,
			updatedAt: new Date(),
		})
		.where(and(eq(schema.team.id, team_id), eq(schema.team.organizationId, org_id)))
		.returning();

	if (!team) {
		await recordWideEvent({
			name: "team.edit",
			description: "Database error editing team",
			data: {
				type: "DatabaseError",
				code: "TeamEditFailed",
				message: "Failed to edit team",
			},
		});
		return c.json({ success: false, error: "Failed to edit team." }, 500);
	}

	await recordWideEvent({
		name: "team.edit",
		description: "Team edited successfully",
		data: {
			organizationId: org_id,
			teamId: team.id,
			editedByUserId: session?.userId || "",
		},
	});

	return c.json({
		success: true,
		data: team,
	});
});

apiRouteAdminOrganization.delete("/team", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "team.delete",
		description: "Remove team requested",
		data: {},
	});

	const session = c.get("session");
	const { org_id, team_id } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "admin.manageTeams");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "team.delete",
			description: "Unauthorized to remove teams",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to remove teams",
			},
		});
		return c.json({ success: false, error: "You don’t have permission to remove teams." }, 401);
	}

	const [removed] = await db
		.delete(schema.team)
		.where(and(eq(schema.team.id, team_id), eq(schema.team.organizationId, org_id)))
		.returning();

	if (!removed) {
		await recordWideEvent({
			name: "team.delete",
			description: "Database error removing team",
			data: {
				type: "DatabaseError",
				code: "TeamRemovalFailed",
				message: "Failed to remove team",
			},
		});
		return c.json({ success: false, error: "Failed to remove team." }, 500);
	}

	await recordWideEvent({
		name: "team.delete",
		description: "Team removed successfully",
		data: {
			organizationId: org_id,
			teamId: removed.id,
			removedByUserId: session?.userId || "",
		},
	});

	return c.json({
		success: true,
		data: removed,
	});
});

apiRouteAdminOrganization.post("/team-member", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "team.member.add",
		description: "Add member to team requested",
		data: {},
	});

	const session = c.get("session");
	const { org_id, team_id, member_id } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "admin.manageTeams");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "team.member.add",
			description: "Unauthorized to add members to team",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to add members to teams",
			},
		});
		return c.json(
			{
				success: false,
				error: "You don’t have permission to add members to teams.",
			},
			401
		);
	}

	const [memberTeam] = await db
		.insert(schema.memberTeam)
		.values({
			id: crypto.randomUUID(),
			teamId: team_id,
			memberId: member_id,
		})
		.returning();

	if (!memberTeam) {
		await recordWideEvent({
			name: "team.member.add",
			description: "Database error adding member to team",
			data: {
				type: "DatabaseError",
				code: "TeamMemberAdditionFailed",
				message: "Failed to add member to team",
			},
		});
		return c.json({ success: false, error: "Failed to add member to team." }, 500);
	}

	await recordWideEvent({
		name: "team.member.add",
		description: "Member added to team successfully",
		data: {
			organizationId: org_id,
			teamId: team_id,
			memberId: member_id,
			addedByUserId: session?.userId || "",
		},
	});

	return c.json({
		success: true,
		data: memberTeam,
	});
});

apiRouteAdminOrganization.delete("/team-member", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "team.member.remove",
		description: "Remove member from team requested",
		data: {},
	});

	const session = c.get("session");
	const { org_id, team_id, member_id } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "admin.manageTeams");
	if (!isAuthorized) {
		await recordWideEvent({
			name: "team.member.remove",
			description: "Unauthorized to remove members from teams",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to remove members from teams",
			},
		});
		return c.json(
			{
				success: false,
				error: "You don’t have permission to remove members from teams.",
			},
			401
		);
	}

	const [removed] = await db
		.delete(schema.memberTeam)
		.where(and(eq(schema.memberTeam.teamId, team_id), eq(schema.memberTeam.memberId, member_id)))
		.returning();

	if (!removed) {
		await recordWideEvent({
			name: "team.member.remove",
			description: "Database error removing member from team",
			data: {
				type: "DatabaseError",
				code: "TeamMemberRemovalFailed",
				message: "Failed to remove member from team",
			},
		});
		return c.json({ success: false, error: "Failed to remove member from team." }, 500);
	}

	await recordWideEvent({
		name: "team.member.remove",
		description: "Member removed from team successfully",
		data: {
			organizationId: org_id,
			teamId: team_id,
			memberId: member_id,
			removedByUserId: session?.userId || "",
		},
	});

	return c.json({
		success: true,
		data: removed,
	});
});

// Bootstrap default Administrators team for an existing organization
apiRouteAdminOrganization.post("/bootstrap-admin-team", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "team.bootstrap",
		description: "Bootstrap admin team requested",
		data: {},
	});

	const session = c.get("session");
	const { org_id } = await c.req.json();

	// Only the org creator or existing admin should be able to do this
	// For now, just check if user is a member of the org
	const membership = await db.query.member.findFirst({
		where: and(eq(schema.member.organizationId, org_id), eq(schema.member.userId, session?.userId || "")),
	});

	if (!membership) {
		await recordWideEvent({
			name: "team.bootstrap",
			description: "Unauthorized to bootstrap admin team",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User is not a member of this organization",
			},
		});
		return c.json({ success: false, error: "You must be a member of this organization." }, 401);
	}

	try {
		const adminTeam = await bootstrapOrganizationAdminTeam(org_id);

		await recordWideEvent({
			name: "team.bootstrap",
			description: "Admin team bootstrapped successfully",
			data: {
				organizationId: org_id,
				teamId: adminTeam.id,
				bootstrappedByUserId: session?.userId || "",
			},
		});

		return c.json({
			success: true,
			data: adminTeam,
		});
	} catch (err) {
		console.error("Failed to bootstrap admin team:", err);
		await recordWideEvent({
			name: "team.bootstrap",
			description: "Failed to bootstrap admin team",
			data: {
				type: "DatabaseError",
				code: "BootstrapFailed",
				message: "Failed to create admin team",
			},
		});
		return c.json({ success: false, error: "Failed to create admin team." }, 500);
	}
});

// Task routes
apiRouteAdminOrganization.route("/task", apiRouteAdminProjectTask);
