import { randomBytes, randomUUID } from "node:crypto";
import {
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
import { createTraceAsync } from "@/tracing/wideEvent";
export const apiRouteAdminOrganization = new Hono<AppEnv>();

// Create a new organization
apiRouteAdminOrganization.post("/create", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	if (!session?.userId) {
		await recordWideError({
			name: "organization.create.auth",
			error: new Error("User not authenticated"),
			code: "UNAUTHORIZED",
			message: "User not authenticated",
			contextData: {},
		});
		return c.json({ success: false, error: "You don't have permission to do that." }, 401);
	}

	const { name, slug, description } = await c.req.json();

	if (!name || !slug) {
		await recordWideError({
			name: "organization.create.validation",
			error: new Error("Missing required fields"),
			code: "INVALID_REQUEST",
			message: "Name and slug are required",
			contextData: { hasName: !!name, hasSlug: !!slug },
		});
		return c.json({ success: false, error: "Name and slug are required" }, 400);
	}

	const existingOrg = await traceAsync(
		"organization.create.check_slug",
		() =>
			db.query.organization.findFirst({
				where: eq(schema.organization.slug, slug),
			}),
		{ description: "Checking if slug is taken", data: { slug } }
	);

	if (existingOrg) {
		await recordWideError({
			name: "organization.create.slug_taken",
			error: new Error("Slug already taken"),
			code: "SLUG_TAKEN",
			message: "Organization slug is already taken",
			contextData: { slug },
		});
		return c.json({ success: false, error: "Organization slug is already taken" }, 400);
	}

	const orgId = randomUUID();

	const newOrg = await traceAsync(
		"organization.create.insert",
		async () => {
			const [org] = await db
				.insert(schema.organization)
				.values({
					id: orgId,
					name,
					slug,
					description: description || "",
				})
				.returning();
			return org;
		},
		{ description: "Creating organization", data: { orgId, name, slug } }
	);

	if (!newOrg) {
		await recordWideError({
			name: "organization.create.insert_failed",
			error: new Error("Failed to create organization"),
			code: "ORG_CREATION_FAILED",
			message: "Failed to create organization",
			contextData: { orgId, name, slug },
		});
		return c.json({ success: false, error: "Failed to create organization" }, 500);
	}

	const membership = await traceAsync(
		"organization.create.membership",
		async () => {
			const [member] = await db
				.insert(schema.member)
				.values({
					id: randomUUID(),
					userId: session.userId,
					organizationId: orgId,
				})
				.returning();
			return member;
		},
		{ description: "Creating membership", data: { orgId, userId: session.userId } }
	);

	if (!membership) {
		await recordWideError({
			name: "organization.create.membership_failed",
			error: new Error("Failed to create membership"),
			code: "MEMBERSHIP_CREATION_FAILED",
			message: "Failed to create membership, rolling back org",
			contextData: { orgId, userId: session.userId },
		});
		await db.delete(schema.organization).where(eq(schema.organization.id, orgId));
		return c.json({ success: false, error: "Failed to create organization membership" }, 500);
	}

	await traceAsync(
		"organization.create.admin_team",
		async () => {
			try {
				await bootstrapOrganizationAdminTeam(orgId);
			} catch (err) {
				console.error("Failed to create default admin team:", err);
				// Don't fail org creation if admin team creation fails
			}
		},
		{ description: "Bootstrapping admin team", data: { orgId } }
	);

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
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, wsClientId, data } = await c.req.json();

	const isAuthorized = await traceAsync(
		"organization.update.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "admin.manageMembers"),
		{ description: "Checking update permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "organization.update.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to update organization",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to do that." }, 401);
	}

	if (data.slug) {
		const existing = await traceAsync(
			"organization.update.check_slug",
			async () => {
				const [org] = await db
					.select()
					.from(schema.organization)
					.where(eq(schema.organization.slug, data.slug))
					.limit(1);
				return org;
			},
			{ description: "Checking if slug is taken", data: { slug: data.slug } }
		);

		if (existing && existing.id !== orgId) {
			await recordWideError({
				name: "organization.update.slug_taken",
				error: new Error("Slug already in use"),
				code: "SLUG_TAKEN",
				message: "Slug already in use by another organization",
				contextData: { orgId, slug: data.slug, existingOrgId: existing.id },
			});
			return c.json({ success: false, error: "Slug already in use by another organization." }, 400);
		}
	}

	const result = await traceAsync(
		"organization.update.update",
		async () => {
			const [org] = await db
				.update(schema.organization)
				.set({
					...data,
					logo: data.logo && `organization/${orgId}/${getFileNameFromUrl(data.logo)}`,
					bannerImg: data.bannerImg && `organization/${orgId}/${getFileNameFromUrl(data.bannerImg)}`,
					updatedAt: new Date(),
				})
				.where(eq(schema.organization.id, orgId))
				.returning();
			return org;
		},
		{ description: "Updating organization", data: { orgId } }
	);

	if (!result) {
		await recordWideError({
			name: "organization.update.failed",
			error: new Error("Failed to update organization"),
			code: "UPDATE_FAILED",
			message: "Failed to update organization",
			contextData: { orgId },
		});
		return c.json({ success: false, error: "Failed to update organization" }, 500);
	}

	await traceAsync(
		"organization.update.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const dataMsg = {
				type: "UPDATE_ORG" as WSBaseMessage["type"],
				data: {
					...result,
					logo: result.logo ? ensureCdnUrl(result.logo) : null,
					bannerImg: result.bannerImg ? ensureCdnUrl(result.bannerImg) : null,
				},
			};

			broadcast(orgId, "admin", dataMsg, found?.socket);
			broadcastPublic(orgId, {
				...dataMsg,
				data: { ...dataMsg.data, privateId: null },
			});

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				broadcastByUserId(member.userId, "", orgId, dataMsg, "");
			});
		},
		{ description: "Broadcasting organization update" }
	);

	return c.json({
		success: true,
		data: {
			...result,
			logo: result.logo ? ensureCdnUrl(result.logo) : null,
			bannerImg: result.bannerImg ? ensureCdnUrl(result.bannerImg) : null,
		},
	});
});

// Upload organization logo
apiRouteAdminOrganization.put("/:orgId/logo", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const orgId = c.req.param("orgId");
	const oldLogo = c.req.header("X-old-file");

	const isAuthorized = await traceAsync(
		"organization.logo.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "admin.manageMembers"),
		{ description: "Checking logo upload permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "organization.logo.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to upload organization logo",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to do that." }, 401);
	}

	const body = await c.req.parseBody();
	const file = body.file;

	if (!file || !(file instanceof File)) {
		await recordWideError({
			name: "organization.logo.validation",
			error: new Error("No file uploaded"),
			code: "NO_FILE",
			message: "No file uploaded for organization logo",
			contextData: { orgId },
		});
		return c.json({ success: false, error: "No file uploaded" }, 400);
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const ext = file.name.split(".").pop() || file.type.split("/")[1] || "png";
	const objectName = `/logo.${ext}`;

	if (oldLogo) {
		await traceAsync(
			"organization.logo.remove_old",
			() => removeObject(`organization/${orgId}/${getFileNameFromUrl(oldLogo)}`),
			{ description: "Removing old logo", data: { orgId, oldLogo } }
		);
	}

	const imagelogo = await traceAsync(
		"organization.logo.upload",
		() =>
			uploadObject(objectName, buffer, `organization/${orgId}`, {
				"Content-Type": file.type || "application/octet-stream",
				originalName: objectName,
			}),
		{
			description: "Uploading organization logo",
			data: { orgId, objectName, fileType: file.type },
			onSuccess: () => ({
				description: "Organization logo uploaded successfully",
				data: { orgId, userId: session?.userId },
			}),
		}
	);

	return c.json({
		success: true,
		orgId,
		originalName: file.name,
		image: imagelogo,
	});
});

// Upload organization banner
apiRouteAdminOrganization.put("/:orgId/banner", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const orgId = c.req.param("orgId");
	const oldBanner = c.req.header("X-old-file");

	const isAuthorized = await traceAsync(
		"organization.banner.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "admin.manageMembers"),
		{ description: "Checking banner upload permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "organization.banner.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to upload organization banner",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to do that." }, 401);
	}

	const body = await c.req.parseBody();
	const file = body.file;

	if (!file || !(file instanceof File)) {
		await recordWideError({
			name: "organization.banner.validation",
			error: new Error("No file uploaded"),
			code: "NO_FILE",
			message: "No file uploaded for organization banner",
			contextData: { orgId },
		});
		return c.json({ success: false, error: "No file uploaded" }, 400);
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const ext = file.name.split(".").pop() || file.type.split("/")[1] || "png";
	const objectName = `banner.${ext}`;

	if (oldBanner) {
		await traceAsync(
			"organization.banner.remove_old",
			() => removeObject(`organization/${orgId}/${getFileNameFromUrl(oldBanner)}`),
			{ description: "Removing old banner", data: { orgId, oldBanner } }
		);
	}

	const imagebanner = await traceAsync(
		"organization.banner.upload",
		() =>
			uploadObject(objectName, buffer, `organization/${orgId}`, {
				"Content-Type": file.type || "application/octet-stream",
				originalName: objectName,
			}),
		{
			description: "Uploading organization banner",
			data: { orgId, objectName, fileType: file.type },
			onSuccess: () => ({
				description: "Organization banner uploaded successfully",
				data: { orgId, userId: session?.userId },
			}),
		}
	);

	return c.json({
		success: true,
		orgId,
		originalName: file.name,
		image: imagebanner,
	});
});

// Label management
// Create label with name and color
apiRouteAdminOrganization.post("/create-label", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, wsClientId, name, color } = await c.req.json();

	const isAuthorized = await traceAsync(
		"label.create.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "content.manageLabels"),
		{ description: "Checking label create permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "label.create.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to create labels",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to create labels." }, 401);
	}

	const created = await traceAsync(
		"label.create.insert",
		async () => {
			const [label] = await db
				.insert(schema.label)
				.values({
					organizationId: orgId,
					name,
					color: color ?? "#cccccc",
				})
				.returning();
			return label;
		},
		{ description: "Creating label", data: { orgId, name, color } }
	);

	if (!created) {
		await recordWideError({
			name: "label.create.insert_failed",
			error: new Error("Failed to create label"),
			code: "LABEL_CREATION_FAILED",
			message: "Failed to create label",
			contextData: { orgId, name },
		});
		return c.json({ success: false, error: "Failed to create label." }, 500);
	}

	const labels = await traceAsync("label.create.fetch_all", () => getLabels(orgId), {
		description: "Fetching all labels",
		data: { orgId },
	});

	await traceAsync(
		"label.create.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_LABELS" as WSBaseMessage["type"],
				data: labels,
			};

			broadcast(orgId, "admin", data, found?.socket);
			broadcastPublic(orgId, { ...data, data: data });

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				broadcastByUserId(member.userId, wsClientId, orgId, data);
			});
		},
		{ description: "Broadcasting label update" }
	);

	return c.json({
		success: true,
		data: labels,
	});
});

// Edit label name and color
apiRouteAdminOrganization.patch("/edit-label", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, wsClientId, id, name, color } = await c.req.json();

	const isAuthorized = await traceAsync(
		"label.edit.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "content.manageLabels"),
		{ description: "Checking label edit permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "label.edit.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to edit labels",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to edit labels." }, 401);
	}

	const edited = await traceAsync(
		"label.edit.update",
		async () => {
			const [label] = await db
				.update(schema.label)
				.set({
					name,
					color: color ?? "hsla(0, 0%, 0%, 1)",
				})
				.where(and(eq(schema.label.id, id), eq(schema.label.organizationId, orgId)))
				.returning();
			return label;
		},
		{ description: "Updating label", data: { orgId, labelId: id, name, color } }
	);

	if (!edited) {
		await recordWideError({
			name: "label.edit.update_failed",
			error: new Error("Failed to edit label"),
			code: "LABEL_EDIT_FAILED",
			message: "Failed to edit label",
			contextData: { orgId, labelId: id },
		});
		return c.json({ success: false, error: "Failed to edit label." }, 500);
	}

	const labels = await traceAsync("label.edit.fetch_all", () => getLabels(orgId), {
		description: "Fetching all labels",
		data: { orgId },
	});

	await traceAsync(
		"label.edit.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_LABELS" as WSBaseMessage["type"],
				data: labels,
			};

			broadcast(orgId, "admin", data, found?.socket);
			broadcastPublic(orgId, { ...data, data: data });

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				broadcastByUserId(member.userId, wsClientId, orgId, data);
			});
		},
		{ description: "Broadcasting label update" }
	);

	return c.json({
		success: true,
		data: labels,
	});
});

// Delete label by label ID
apiRouteAdminOrganization.delete("/delete-label", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, wsClientId, id } = await c.req.json();

	const isAuthorized = await traceAsync(
		"label.delete.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "content.manageLabels"),
		{ description: "Checking label delete permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "label.delete.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to delete labels",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to delete labels." }, 401);
	}

	const removed = await traceAsync(
		"label.delete.remove",
		async () => {
			const [label] = await db
				.delete(schema.label)
				.where(and(eq(schema.label.id, id), eq(schema.label.organizationId, orgId)))
				.returning();
			return label;
		},
		{ description: "Deleting label", data: { orgId, labelId: id } }
	);

	if (!removed) {
		await recordWideError({
			name: "label.delete.remove_failed",
			error: new Error("Failed to remove label"),
			code: "LABEL_DELETION_FAILED",
			message: "Failed to remove label",
			contextData: { orgId, labelId: id },
		});
		return c.json({ success: false, error: "Failed to remove label." }, 500);
	}

	const labels = await traceAsync("label.delete.fetch_all", () => getLabels(orgId), {
		description: "Fetching all labels",
		data: { orgId },
	});

	await traceAsync(
		"label.delete.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_LABELS" as WSBaseMessage["type"],
				data: labels,
			};

			broadcast(orgId, "admin", data, found?.socket);
			broadcastPublic(orgId, { ...data, data: data });

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				broadcastByUserId(member.userId, wsClientId, orgId, data);
			});
		},
		{ description: "Broadcasting label update" }
	);

	return c.json({
		success: true,
		data: labels,
	});
});

// Category management
// Create category with name, color, and icon
apiRouteAdminOrganization.post("/create-category", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, wsClientId, name, color, icon } = await c.req.json();

	const isAuthorized = await traceAsync(
		"category.create.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "content.manageCategories"),
		{ description: "Checking category create permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "category.create.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to create categories",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to create categories." }, 401);
	}

	const created = await traceAsync(
		"category.create.insert",
		async () => {
			const [category] = await db
				.insert(schema.category)
				.values({
					organizationId: orgId,
					name,
					color: color ?? "hsla(0, 0%, 0%, 1)",
					icon,
				})
				.returning();
			return category;
		},
		{ description: "Creating category", data: { orgId, name, color, icon } }
	);

	if (!created) {
		await recordWideError({
			name: "category.create.insert_failed",
			error: new Error("Failed to create category"),
			code: "CATEGORY_CREATION_FAILED",
			message: "Failed to create category",
			contextData: { orgId, name },
		});
		return c.json({ success: false, error: "Failed to create category." }, 500);
	}

	const categories = await traceAsync(
		"category.create.fetch_all",
		() =>
			db.query.category.findMany({
				where: (category) => eq(category.organizationId, orgId),
			}),
		{ description: "Fetching all categories", data: { orgId } }
	);

	await traceAsync(
		"category.create.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_CATEGORIES" as WSBaseMessage["type"],
				data: categories,
			};

			broadcast(orgId, "admin", data, found?.socket);
			broadcastPublic(orgId, { ...data, data: data });

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				broadcastByUserId(member.userId, wsClientId, orgId, data);
			});
		},
		{ description: "Broadcasting category update" }
	);

	return c.json({
		success: true,
		data: categories,
	});
});

// Edit category name, color, and icon
apiRouteAdminOrganization.patch("/edit-category", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, wsClientId, id, name, color, icon } = await c.req.json();

	const isAuthorized = await traceAsync(
		"category.edit.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "content.manageCategories"),
		{ description: "Checking category edit permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "category.edit.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to edit categories",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to edit categories." }, 401);
	}

	const edited = await traceAsync(
		"category.edit.update",
		async () => {
			const [category] = await db
				.update(schema.category)
				.set({
					name,
					color: color ?? "hsla(0, 0%, 0%, 1)",
					icon,
				})
				.where(and(eq(schema.category.id, id), eq(schema.category.organizationId, orgId)))
				.returning();
			return category;
		},
		{ description: "Updating category", data: { orgId, categoryId: id, name, color, icon } }
	);

	if (!edited) {
		await recordWideError({
			name: "category.edit.update_failed",
			error: new Error("Failed to edit category"),
			code: "CATEGORY_EDIT_FAILED",
			message: "Failed to edit category",
			contextData: { orgId, categoryId: id },
		});
		return c.json({ success: false, error: "Failed to edit category." }, 500);
	}

	const categories = await traceAsync(
		"category.edit.fetch_all",
		() =>
			db.query.category.findMany({
				where: (category) => eq(category.organizationId, orgId),
			}),
		{ description: "Fetching all categories", data: { orgId } }
	);

	await traceAsync(
		"category.edit.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_CATEGORIES" as WSBaseMessage["type"],
				data: categories,
			};

			broadcast(orgId, "admin", data, found?.socket);
			broadcastPublic(orgId, { ...data, data: data });

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				broadcastByUserId(member.userId, wsClientId, orgId, data);
			});
		},
		{ description: "Broadcasting category update" }
	);

	return c.json({
		success: true,
		data: categories,
	});
});

// Delete category by category ID
apiRouteAdminOrganization.delete("/delete-category", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, wsClientId, id } = await c.req.json();

	const isAuthorized = await traceAsync(
		"category.delete.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "content.manageCategories"),
		{ description: "Checking category delete permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "category.delete.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to delete categories",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to delete categories." }, 401);
	}

	const removed = await traceAsync(
		"category.delete.remove",
		async () => {
			const [category] = await db
				.delete(schema.category)
				.where(and(eq(schema.category.id, id), eq(schema.category.organizationId, orgId)))
				.returning();
			return category;
		},
		{ description: "Deleting category", data: { orgId, categoryId: id } }
	);

	if (!removed) {
		await recordWideError({
			name: "category.delete.remove_failed",
			error: new Error("Failed to remove category"),
			code: "CATEGORY_DELETION_FAILED",
			message: "Failed to remove category",
			contextData: { orgId, categoryId: id },
		});
		return c.json({ success: false, error: "Failed to remove category." }, 500);
	}

	const categories = await traceAsync(
		"category.delete.fetch_all",
		() =>
			db.query.category.findMany({
				where: (category) => eq(category.organizationId, orgId),
			}),
		{ description: "Fetching all categories", data: { orgId } }
	);

	await traceAsync(
		"category.delete.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_CATEGORIES" as WSBaseMessage["type"],
				data: categories,
			};

			broadcast(orgId, "admin", data, found?.socket);
			broadcastPublic(orgId, { ...data, data: data });

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				broadcastByUserId(member.userId, wsClientId, orgId, data);
			});
		},
		{ description: "Broadcasting category update" }
	);

	return c.json({
		success: true,
		data: categories,
	});
});

// Saved View management
// Create saved view with name and filter params
apiRouteAdminOrganization.post("/create-view", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, wsClientId, name, value, logo, slug, viewConfig } = await c.req.json();

	const isAuthorized = await traceAsync(
		"savedView.create.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "admin.manageMembers"),
		{ description: "Checking view create permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "savedView.create.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to create saved views",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to create saved views." }, 401);
	}

	const view = await traceAsync(
		"savedView.create.insert",
		async () => {
			const [created] = await db
				.insert(schema.savedView)
				.values({
					organizationId: orgId,
					createdById: session?.userId,
					name,
					logo,
					slug,
					filterParams: value,
					viewConfig: viewConfig,
				})
				.returning();
			return created;
		},
		{ description: "Creating saved view", data: { orgId, name, slug } }
	);

	if (!view) {
		await recordWideError({
			name: "savedView.create.insert_failed",
			error: new Error("Failed to create saved view"),
			code: "SAVED_VIEW_CREATION_FAILED",
			message: "Failed to create saved view",
			contextData: { orgId, name },
		});
		return c.json({ success: false, error: "Failed to create view." }, 500);
	}

	const views = await traceAsync(
		"savedView.create.fetch_all",
		() =>
			db.query.savedView.findMany({
				where: (view) => eq(view.organizationId, orgId),
			}),
		{ description: "Fetching all saved views", data: { orgId } }
	);

	await traceAsync(
		"savedView.create.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_VIEWS" as WSBaseMessage["type"],
				data: views,
			};

			broadcast(orgId, "admin", data, found?.socket);
			broadcastPublic(orgId, { ...data, data: data });

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				broadcastByUserId(member.userId, wsClientId, orgId, data);
			});
		},
		{ description: "Broadcasting view update" }
	);

	return c.json({
		success: true,
		data: views,
	});
});

// Update saved view
apiRouteAdminOrganization.patch("/update-view", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, wsClientId, id, name, value, viewConfig, logo, slug } = await c.req.json();

	const isAuthorized = await traceAsync(
		"savedView.update.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "admin.manageMembers"),
		{ description: "Checking view update permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "savedView.update.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to update saved views",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to update saved views." }, 401);
	}

	const view = await traceAsync(
		"savedView.update.update",
		async () => {
			const [updated] = await db
				.update(schema.savedView)
				.set({
					name,
					slug,
					logo,
					filterParams: value,
					viewConfig: viewConfig,
					updatedAt: new Date(),
				})
				.where(and(eq(schema.savedView.id, id), eq(schema.savedView.organizationId, orgId)))
				.returning();
			return updated;
		},
		{ description: "Updating saved view", data: { orgId, viewId: id, name, slug } }
	);

	if (!view) {
		await recordWideError({
			name: "savedView.update.update_failed",
			error: new Error("Failed to update saved view"),
			code: "SAVED_VIEW_UPDATE_FAILED",
			message: "Failed to update saved view",
			contextData: { orgId, viewId: id },
		});
		return c.json({ success: false, error: "Failed to update view." }, 500);
	}

	const views = await traceAsync(
		"savedView.update.fetch_all",
		() =>
			db.query.savedView.findMany({
				where: (view) => eq(view.organizationId, orgId),
			}),
		{ description: "Fetching all saved views", data: { orgId } }
	);

	await traceAsync(
		"savedView.update.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_VIEWS" as WSBaseMessage["type"],
				data: views,
			};

			broadcast(orgId, "admin", data, found?.socket);
			broadcastPublic(orgId, { ...data, data: data });

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				broadcastByUserId(member.userId, wsClientId, orgId, data);
			});
		},
		{ description: "Broadcasting view update" }
	);

	return c.json({
		success: true,
		data: views,
	});
});

// Delete saved view
apiRouteAdminOrganization.delete("/delete-view", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, wsClientId, id } = await c.req.json();

	const isAuthorized = await traceAsync(
		"savedView.delete.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "admin.manageMembers"),
		{ description: "Checking view delete permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "savedView.delete.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to delete saved views",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to delete saved views." }, 401);
	}

	const removed = await traceAsync(
		"savedView.delete.remove",
		async () => {
			const [view] = await db
				.delete(schema.savedView)
				.where(and(eq(schema.savedView.id, id), eq(schema.savedView.organizationId, orgId)))
				.returning();
			return view;
		},
		{ description: "Deleting saved view", data: { orgId, viewId: id } }
	);

	if (!removed) {
		await recordWideError({
			name: "savedView.delete.remove_failed",
			error: new Error("Failed to remove saved view"),
			code: "SAVED_VIEW_DELETION_FAILED",
			message: "Failed to remove saved view",
			contextData: { orgId, viewId: id },
		});
		return c.json({ success: false, error: "Failed to remove view." }, 500);
	}

	const views = await traceAsync(
		"savedView.delete.fetch_all",
		() =>
			db.query.savedView.findMany({
				where: (view) => eq(view.organizationId, orgId),
			}),
		{ description: "Fetching all saved views", data: { orgId } }
	);

	await traceAsync(
		"savedView.delete.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_VIEWS" as WSBaseMessage["type"],
				data: views,
			};

			broadcast(orgId, "admin", data, found?.socket);
			broadcastPublic(orgId, { ...data, data: data });

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				broadcastByUserId(member.userId, wsClientId, orgId, data);
			});
		},
		{ description: "Broadcasting view update" }
	);

	return c.json({
		success: true,
		data: views,
	});
});

apiRouteAdminOrganization.post("/connections/github/sync-repo", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const {
		org_id: orgId,
		repo_id: repoId,
		repo_name: repoName,
		installation_id: installationId,
		category_id: categoryId,
	} = await c.req.json();

	const isAuthorized = await traceAsync(
		"github.syncRepo.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "admin.administrator"),
		{ description: "Checking repo sync permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "github.syncRepo.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to sync GitHub repositories",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to sync repositories." }, 401);
	}

	const existing = await traceAsync(
		"github.syncRepo.check_existing",
		() =>
			db.query.githubRepository.findFirst({
				where: and(
					eq(schema.githubRepository.installationId, installationId),
					eq(schema.githubRepository.repoId, repoId),
					eq(schema.githubRepository.organizationId, orgId),
					eq(schema.githubRepository.categoryId, categoryId)
				),
			}),
		{ description: "Checking for existing sync", data: { orgId, repoId, installationId } }
	);

	if (existing) {
		await recordWideError({
			name: "github.syncRepo.already_synced",
			error: new Error("Repository already synced"),
			code: "REPO_ALREADY_SYNCED",
			message: "Repository is already synced with this organization",
			contextData: { orgId, repoId, installationId },
		});
		return c.json({ success: false, error: "Repository already synced." }, 400);
	}

	const result = await traceAsync(
		"github.syncRepo.insert",
		() =>
			db.insert(schema.githubRepository).values({
				id: crypto.randomUUID(),
				installationId: installationId,
				repoId: repoId,
				repoName: repoName,
				organizationId: orgId,
				categoryId: categoryId,
				userId: session?.userId || "",
			}),
		{
			description: "Syncing GitHub repository",
			data: { orgId, repoId, repoName, installationId },
			onSuccess: () => ({
				description: "GitHub repository synced successfully",
				data: { orgId, repoId, userId: session?.userId },
			}),
		}
	);

	return c.json({
		success: true,
		data: result,
	});
});

// team member routes

apiRouteAdminOrganization.post("/member", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, emails }: { org_id: string; emails: string[] } = await c.req.json();

	const isAuthorized = await traceAsync(
		"member.invite.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "admin.administrator"),
		{ description: "Checking invite permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "member.invite.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to invite members",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to invite members." }, 401);
	}

	const { invites, failedEmails } = await traceAsync(
		"member.invite.process",
		async () => {
			// biome-ignore lint/suspicious/noExplicitAny: <any>
			const invites: any[] = [];
			const failedEmails: string[] = [];

			for (const email of emails) {
				try {
					const user = await db.query.user.findFirst({
						where: (usr) => eq(usr.email, email),
					});

					const existingMember = user
						? await db.query.member.findFirst({
								where: and(eq(schema.member.organizationId, orgId), eq(schema.member.userId, user.id)),
							})
						: null;

					if (existingMember) continue;

					const existingInvite = await db.query.invite.findFirst({
						where: and(eq(schema.invite.organizationId, orgId), eq(schema.invite.email, email)),
					});

					if (existingInvite) continue;

					const inviteCode = randomBytes(12).toString("hex");

					const [newInvite] = await db
						.insert(schema.invite)
						.values({
							id: randomBytes(8).toString("hex"),
							organizationId: orgId,
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

			return { invites, failedEmails };
		},
		{
			description: "Processing member invites",
			data: { orgId, emailCount: emails.length },
			onSuccess: (result) => ({
				description: "Member invites processed",
				data: { inviteCount: result.invites.length, failedCount: result.failedEmails.length },
			}),
		}
	);

	return c.json({
		success: true,
		invites,
		...(failedEmails.length > 0 && { errors: failedEmails }),
	});
});

apiRouteAdminOrganization.delete("/member", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, user_id: userId } = await c.req.json();

	const isAuthorized = await traceAsync(
		"member.remove.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "admin.administrator"),
		{ description: "Checking member remove permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "member.remove.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to remove members",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to remove members." }, 401);
	}

	const removed = await traceAsync(
		"member.remove.delete",
		async () => {
			const [member] = await db
				.delete(schema.member)
				.where(and(eq(schema.member.organizationId, orgId), eq(schema.member.userId, userId)))
				.returning();
			return member;
		},
		{ description: "Removing member", data: { orgId, userId } }
	);

	if (!removed) {
		await recordWideError({
			name: "member.remove.delete_failed",
			error: new Error("Failed to remove member"),
			code: "MEMBER_REMOVAL_FAILED",
			message: "Failed to remove member",
			contextData: { orgId, userId },
		});
		return c.json({ success: false, error: "Failed to remove member." }, 500);
	}

	await traceAsync(
		"member.remove.broadcast",
		async () => {
			broadcastByUserId(userId, "", orgId, {
				type: "MEMBER_ACTIONS",
				data: { orgId, userId, action: "REMOVED" },
			});
		},
		{ description: "Broadcasting member removal" }
	);

	return c.json({
		success: true,
	});
});

// Get GitHub connection details
apiRouteAdminOrganization.get("/:orgId/connections/github", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const orgId = c.req.param("orgId");

	const isAuthorized = await traceAsync(
		"github.connections.fetch.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "admin.administrator"),
		{ description: "Checking connections fetch permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "github.connections.fetch.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to fetch GitHub connections",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to fetch connections." }, 401);
	}

	const githubInstall = await traceAsync(
		"github.connections.fetch.installation",
		() =>
			db.query.githubInstallation.findFirst({
				where: eq(schema.githubInstallation.organizationId, orgId),
				with: { user: true },
			}),
		{ description: "Fetching GitHub installation", data: { orgId } }
	);

	const githubInfo = await traceAsync(
		"github.connections.fetch.details",
		async () => {
			if (githubInstall?.installationId) {
				return getInstallationDetailsWithRepos(githubInstall);
			}
			return null;
		},
		{ description: "Fetching installation details with repos", data: { orgId } }
	);

	const githubConnections = await traceAsync(
		"github.connections.fetch.synced_repos",
		async () => {
			const repos = await db.query.githubRepository.findMany({
				where: and(
					eq(schema.githubRepository.organizationId, orgId),
					eq(schema.githubRepository.installationId, githubInfo?.installationId ?? -1)
				),
			});

			return repos.map((conn) => ({
				...conn,
				repoName: githubInfo?.repositories.find((r) => r.id === conn.repoId)?.full_name || "Unknown repo",
				avatarUrl: githubInfo?.account?.avatar_url,
			}));
		},
		{
			description: "Fetching synced repositories",
			data: { orgId },
			onSuccess: (result) => ({
				description: "GitHub connections fetched successfully",
				data: { connectionCount: result.length },
			}),
		}
	);

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
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, name, description, permissions } = await c.req.json();

	const isAuthorized = await traceAsync(
		"team.create.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "admin.manageTeams"),
		{ description: "Checking team create permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "team.create.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to create teams",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to create teams." }, 401);
	}

	const teamPermissions: TeamPermissions = permissions
		? {
				admin: { ...defaultTeamPermissions.admin, ...permissions.admin },
				content: { ...defaultTeamPermissions.content, ...permissions.content },
				tasks: { ...defaultTeamPermissions.tasks, ...permissions.tasks },
				moderation: { ...defaultTeamPermissions.moderation, ...permissions.moderation },
			}
		: defaultTeamPermissions;

	const team = await traceAsync(
		"team.create.insert",
		async () => {
			const [created] = await db
				.insert(schema.team)
				.values({
					id: crypto.randomUUID(),
					organizationId: orgId,
					name,
					description,
					permissions: teamPermissions,
				})
				.returning();
			return created;
		},
		{ description: "Creating team", data: { orgId, name } }
	);

	if (!team) {
		await recordWideError({
			name: "team.create.insert_failed",
			error: new Error("Failed to create team"),
			code: "TEAM_CREATION_FAILED",
			message: "Failed to create team",
			contextData: { orgId, name },
		});
		return c.json({ success: false, error: "Failed to create team." }, 500);
	}

	return c.json({
		success: true,
		data: team,
	});
});

apiRouteAdminOrganization.patch("/team", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, team_id: teamId, name, description, permissions } = await c.req.json();

	const isAuthorized = await traceAsync(
		"team.edit.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "admin.manageTeams"),
		{ description: "Checking team edit permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "team.edit.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to edit teams",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to edit teams." }, 401);
	}

	const teamPermissions: TeamPermissions = permissions
		? {
				admin: { ...defaultTeamPermissions.admin, ...permissions.admin },
				content: { ...defaultTeamPermissions.content, ...permissions.content },
				tasks: { ...defaultTeamPermissions.tasks, ...permissions.tasks },
				moderation: { ...defaultTeamPermissions.moderation, ...permissions.moderation },
			}
		: defaultTeamPermissions;

	const team = await traceAsync(
		"team.edit.update",
		async () => {
			const [updated] = await db
				.update(schema.team)
				.set({
					name,
					description,
					permissions: teamPermissions,
					updatedAt: new Date(),
				})
				.where(and(eq(schema.team.id, teamId), eq(schema.team.organizationId, orgId)))
				.returning();
			return updated;
		},
		{ description: "Updating team", data: { orgId, teamId, name } }
	);

	if (!team) {
		await recordWideError({
			name: "team.edit.update_failed",
			error: new Error("Failed to edit team"),
			code: "TEAM_EDIT_FAILED",
			message: "Failed to edit team",
			contextData: { orgId, teamId },
		});
		return c.json({ success: false, error: "Failed to edit team." }, 500);
	}

	return c.json({
		success: true,
		data: team,
	});
});

apiRouteAdminOrganization.delete("/team", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, team_id: teamId } = await c.req.json();

	const isAuthorized = await traceAsync(
		"team.delete.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "admin.manageTeams"),
		{ description: "Checking team delete permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "team.delete.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to remove teams",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to remove teams." }, 401);
	}

	const removed = await traceAsync(
		"team.delete.remove",
		async () => {
			const [team] = await db
				.delete(schema.team)
				.where(and(eq(schema.team.id, teamId), eq(schema.team.organizationId, orgId)))
				.returning();
			return team;
		},
		{ description: "Deleting team", data: { orgId, teamId } }
	);

	if (!removed) {
		await recordWideError({
			name: "team.delete.remove_failed",
			error: new Error("Failed to remove team"),
			code: "TEAM_REMOVAL_FAILED",
			message: "Failed to remove team",
			contextData: { orgId, teamId },
		});
		return c.json({ success: false, error: "Failed to remove team." }, 500);
	}

	return c.json({
		success: true,
		data: removed,
	});
});

apiRouteAdminOrganization.post("/team-member", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, team_id: teamId, member_id: memberId } = await c.req.json();

	const isAuthorized = await traceAsync(
		"team.member.add.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "admin.manageTeams"),
		{ description: "Checking team member add permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "team.member.add.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to add members to teams",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to add members to teams." }, 401);
	}

	const memberTeam = await traceAsync(
		"team.member.add.insert",
		async () => {
			const [created] = await db
				.insert(schema.memberTeam)
				.values({
					id: crypto.randomUUID(),
					teamId: teamId,
					memberId: memberId,
				})
				.returning();
			return created;
		},
		{ description: "Adding member to team", data: { orgId, teamId, memberId } }
	);

	if (!memberTeam) {
		await recordWideError({
			name: "team.member.add.insert_failed",
			error: new Error("Failed to add member to team"),
			code: "TEAM_MEMBER_ADDITION_FAILED",
			message: "Failed to add member to team",
			contextData: { orgId, teamId, memberId },
		});
		return c.json({ success: false, error: "Failed to add member to team." }, 500);
	}

	return c.json({
		success: true,
		data: memberTeam,
	});
});

apiRouteAdminOrganization.delete("/team-member", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, team_id: teamId, member_id: memberId } = await c.req.json();

	const isAuthorized = await traceAsync(
		"team.member.remove.auth",
		() => hasOrgPermission(session?.userId || "", orgId, "admin.manageTeams"),
		{ description: "Checking team member remove permission", data: { orgId, userId: session?.userId } }
	);

	if (!isAuthorized) {
		await recordWideError({
			name: "team.member.remove.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to remove members from teams",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You don't have permission to remove members from teams." }, 401);
	}

	const removed = await traceAsync(
		"team.member.remove.delete",
		async () => {
			const [member] = await db
				.delete(schema.memberTeam)
				.where(and(eq(schema.memberTeam.teamId, teamId), eq(schema.memberTeam.memberId, memberId)))
				.returning();
			return member;
		},
		{ description: "Removing member from team", data: { orgId, teamId, memberId } }
	);

	if (!removed) {
		await recordWideError({
			name: "team.member.remove.delete_failed",
			error: new Error("Failed to remove member from team"),
			code: "TEAM_MEMBER_REMOVAL_FAILED",
			message: "Failed to remove member from team",
			contextData: { orgId, teamId, memberId },
		});
		return c.json({ success: false, error: "Failed to remove member from team." }, 500);
	}

	return c.json({
		success: true,
		data: removed,
	});
});

// Bootstrap default Administrators team for an existing organization
apiRouteAdminOrganization.post("/bootstrap-admin-team", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const recordWideEvent = c.get("recordWideEvent");

	const session = c.get("session");
	const { org_id: orgId } = await c.req.json();

	const membership = await traceAsync(
		"team.bootstrap.membership_check",
		() =>
			db.query.member.findFirst({
				where: and(eq(schema.member.organizationId, orgId), eq(schema.member.userId, session?.userId || "")),
			}),
		{ description: "Checking user membership", data: { orgId, userId: session?.userId } }
	);

	if (!membership) {
		await recordWideError({
			name: "team.bootstrap.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User is not a member of this organization",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json({ success: false, error: "You must be a member of this organization." }, 401);
	}

	const adminTeam = await traceAsync("team.bootstrap.create", () => bootstrapOrganizationAdminTeam(orgId), {
		description: "Bootstrapping admin team",
		data: { orgId, userId: session?.userId },
		onSuccess: (team) => ({
			description: "Admin team bootstrapped successfully",
			data: { teamId: team.id },
		}),
	});

	if (!adminTeam) {
		await recordWideError({
			name: "team.bootstrap.failed",
			error: new Error("Bootstrap failed"),
			code: "BOOTSTRAP_FAILED",
			message: "Failed to create admin team",
			contextData: { orgId },
		});
		return c.json({ success: false, error: "Failed to create admin team." }, 500);
	}

	await recordWideEvent({
		name: "team.bootstrap.success",
		description: "Admin team bootstrapped successfully",
		data: {
			organizationId: orgId,
			teamId: adminTeam.id,
			bootstrappedByUserId: session?.userId || "",
		},
	});

	return c.json({ success: true, data: adminTeam });
});

// Task routes
apiRouteAdminOrganization.route("/task", apiRouteAdminProjectTask);
