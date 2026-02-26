import { randomBytes, randomUUID } from "node:crypto";
import {
	bootstrapOrganizationAdminTeam,
	db,
	defaultTeamPermissions,
	getIssueTemplates,
	getLabels,
	getOrganizationMembers,
	searchOrgMembers,
	searchOrgInteractors,
	getBlockedUsers,
	getBlockedUserIds,
	blockUser,
	unblockUser,
	schema,
	type TeamPermissions, auth
} from "@repo/database";

import { removeObject, uploadObject } from "@repo/storage";
import { ensureCdnUrl, getFileNameFromUrl } from "@repo/util";
import { getInstallationDetailsWithRepos } from "@repo/util/github/auth";
import { and, eq, inArray, ne } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { broadcast, broadcastByUserId, broadcastPublic, findClientByWsId } from "../../../ws";
import type { WSBaseMessage } from "../../../ws/types";
import { apiRouteAdminProjectTask } from "./task";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { refreshGitHubTokenIfNeeded, traceOrgPermissionCheck } from "@/util";
import { Octokit } from "@octokit/rest";
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
		{
			description: "Creating organization", data: {
				organization: {
					id: orgId,
					name: name,
					slug: slug,
				}
			}
		}
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
		{
			description: "Creating membership",
			data: {
				organization: { id: orgId },
			},
		}
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
		{ description: "Bootstrapping admin team", data: { organization: { id: orgId } } }
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

	const isAuthorized = await traceOrgPermissionCheck(
		session?.userId ?? "",
		orgId,
		"admin.manageMembers"
	);

	if (!isAuthorized) {
		return c.json(
			{ success: false, error: "You don't have permission to do that." },
			401
		);
	}

	// -------------------------------------------------------------------------
	// Transaction: slug check + update
	// -------------------------------------------------------------------------
	const result = await traceAsync(
		"organization.update.transaction",
		async () => {
			return db.transaction(async (tx) => {
				// 1️⃣ Fetch current org (lock row)
				const [currentOrg] = await tx
					.select({
						id: schema.organization.id,
						slug: schema.organization.slug,
					})
					.from(schema.organization)
					.where(eq(schema.organization.id, orgId))
					.limit(1)
					.for("update");

				if (!currentOrg) {
					return null;
				}

				// 2️⃣ Slug uniqueness check (only if changed)
				if (
					data.slug &&
					data.slug !== currentOrg.slug
				) {
					const [existing] = await tx
						.select({
							id: schema.organization.id,
						})
						.from(schema.organization)
						.where(eq(schema.organization.slug, data.slug))
						.limit(1);

					if (existing) {
						throw new Error("SLUG_TAKEN");
					}
				}

				// 3️⃣ Update org
				const [updated] = await tx
					.update(schema.organization)
					.set({
						...data,
						logo:
							data.logo &&
							`organization/${orgId}/${getFileNameFromUrl(
								data.logo
							)}`,
						bannerImg:
							data.bannerImg &&
							`organization/${orgId}/${getFileNameFromUrl(
								data.bannerImg
							)}`,
						updatedAt: new Date(),
					})
					.where(eq(schema.organization.id, orgId))
					.returning();

				return updated ?? null;
			});
		},
		{
			description:
				"Updating organization (transactional)",
			data: {
				organization: { id: orgId },
			},
		}
	).catch(async (err) => {
		if ((err as Error).message === "SLUG_TAKEN") {
			await recordWideError({
				name: "organization.update.slug_taken",
				error: err,
				code: "SLUG_TAKEN",
				message:
					"Slug already in use by another organization",
				contextData: {
					organization: { id: orgId },
					slug: data.slug,
				},
			});

			return null;
		}

		throw err;
	});

	if (!result) {
		return c.json(
			{
				success: false,
				error:
					"Slug already in use by another organization.",
			},
			400
		);
	}

	await traceAsync(
		"organization.update.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);

			const dataMsg = {
				type: "UPDATE_ORG" as WSBaseMessage["type"],
				data: {
					...result,
					logo: result.logo
						? ensureCdnUrl(result.logo)
						: null,
					bannerImg: result.bannerImg
						? ensureCdnUrl(result.bannerImg)
						: null,
				},
			};

			broadcast(orgId, "admin", dataMsg, found?.socket);
			broadcastPublic(orgId, {
				...dataMsg,
				data: {
					...dataMsg.data,
					privateId: null,
				},
			});

			const members =
				await getOrganizationMembers(orgId);

			members.forEach((member) => {
				broadcastByUserId(
					member.userId,
					"",
					orgId,
					dataMsg,
					""
				);
			});
		},
		{ description: "Broadcasting organization update" }
	);

	return c.json({
		success: true,
		data: {
			...result,
			logo: result.logo ? ensureCdnUrl(result.logo) : null,
			bannerImg: result.bannerImg
				? ensureCdnUrl(result.bannerImg)
				: null,
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

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.manageMembers");

	if (!isAuthorized) {
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
			{
				description: "Removing old logo", data: {
					organization: { id: orgId },
					logo: oldLogo
				}
			}
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
				data: { organization: { id: orgId }, user: { id: session?.userId } },
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

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.manageMembers");

	if (!isAuthorized) {
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
				data: { organization: { id: orgId }, user: { id: session?.userId } },
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

	const { org_id: orgId, wsClientId, name, color, visible } = await c.req.json();

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "content.manageLabels");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to do that." }, 401);
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
					visible: visible ?? "public",
				})
				.returning();
			return label;
		},
		{ description: "Creating label", data: { orgId, name, color, visible } }
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

			const publicVisibleLabels = labels.filter(
				(label) => label.visible === "public"
			);

			const data = {
				type: "UPDATE_LABELS" as WSBaseMessage["type"],
				data: labels,
			};

			const publicData = {
				type: "UPDATE_LABELS" as WSBaseMessage["type"],
				data: publicVisibleLabels,
			};

			broadcast(orgId, "admin", data, found?.socket);
			broadcastPublic(orgId, publicData);

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

	const { org_id: orgId, wsClientId, id, name, color, visible } = await c.req.json();

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "content.manageLabels");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to do that." }, 401);
	}

	const edited = await traceAsync(
		"label.edit.update",
		async () => {
			const [label] = await db
				.update(schema.label)
				.set({
					name,
					color: color ?? "hsla(0, 0%, 0%, 1)",
					...(visible !== undefined && { visible }),
				})
				.where(and(eq(schema.label.id, id), eq(schema.label.organizationId, orgId)))
				.returning();
			return label;
		},
		{
			description: "Updating label",
			data: { orgId, labelId: id, name, color, visible },
		}
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
			const publicVisibleLabels = labels.filter(
				(label) => label.visible === "public"
			);
			const data = {
				type: "UPDATE_LABELS" as WSBaseMessage["type"],
				data: labels,
			};
			const publicData = {
				type: "UPDATE_LABELS" as WSBaseMessage["type"],
				data: publicVisibleLabels,
			};

			broadcast(orgId, "admin", data, found?.socket);
			broadcastPublic(orgId, publicData);

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

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "content.manageLabels");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to do that." }, 401);
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
			const publicVisibleLabels = labels.filter(
				(label) => label.visible === "public"
			);
			const data = {
				type: "UPDATE_LABELS" as WSBaseMessage["type"],
				data: labels,
			};
			const publicData = {
				type: "UPDATE_LABELS" as WSBaseMessage["type"],
				data: publicVisibleLabels,
			};

			broadcast(orgId, "admin", data, found?.socket);
			broadcastPublic(orgId, publicData);

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

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "content.manageCategories");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to do that." }, 401);
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

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "content.manageCategories");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to do that." }, 401);
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
		{
			description: "Updating category",
			data: { orgId, categoryId: id, name, color, icon },
		}
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

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "content.manageCategories");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to do that." }, 401);
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

// Issue Template management
// Create issue template
apiRouteAdminOrganization.post("/create-issue-template", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const {
		org_id: orgId,
		wsClientId,
		name,
		titlePrefix,
		description,
		status,
		priority,
		categoryId,
		labelIds,
		assigneeIds,
		releaseId,
		visible,
	} = await c.req.json();

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.administrator");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to do that." }, 401);
	}

	const templateId = randomUUID();

	const created = await traceAsync(
		"issueTemplate.create.insert",
		async () => {
			const [template] = await db
				.insert(schema.issueTemplate)
				.values({
					id: templateId,
					organizationId: orgId,
					name,
					titlePrefix: titlePrefix || null,
					description: description || null,
					status: status || null,
					priority: priority || null,
					categoryId: categoryId || null,
					releaseId: releaseId || null,
					visible: visible || null,
				})
				.returning();
			return template;
		},
		{ description: "Creating issue template", data: { orgId, name } }
	);

	if (!created) {
		await recordWideError({
			name: "issueTemplate.create.insert_failed",
			error: new Error("Failed to create issue template"),
			code: "ISSUE_TEMPLATE_CREATION_FAILED",
			message: "Failed to create issue template",
			contextData: { orgId, name },
		});
		return c.json({ success: false, error: "Failed to create issue template." }, 500);
	}

	// Insert label associations
	if (labelIds && Array.isArray(labelIds) && labelIds.length > 0) {
		await traceAsync(
			"issueTemplate.create.insert_labels",
			async () => {
				await db.insert(schema.issueTemplateLabel).values(
					labelIds.map((labelId: string) => ({
						templateId,
						labelId,
					}))
				);
			},
			{ description: "Creating issue template label associations", data: { templateId, labelIds } }
		);
	}

	// Insert assignee associations
	if (assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length > 0) {
		await traceAsync(
			"issueTemplate.create.insert_assignees",
			async () => {
				await db.insert(schema.issueTemplateAssignee).values(
					assigneeIds.map((userId: string) => ({
						templateId,
						userId,
					}))
				);
			},
			{ description: "Creating issue template assignee associations", data: { templateId, assigneeIds } }
		);
	}

	const templates = await traceAsync("issueTemplate.create.fetch_all", () => getIssueTemplates(orgId), {
		description: "Fetching all issue templates",
		data: { orgId },
	});

	await traceAsync(
		"issueTemplate.create.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_ISSUE_TEMPLATES" as WSBaseMessage["type"],
				data: templates,
			};

			broadcast(orgId, "admin", data, found?.socket);

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				broadcastByUserId(member.userId, wsClientId, orgId, data);
			});
		},
		{ description: "Broadcasting issue template update" }
	);

	return c.json({
		success: true,
		data: templates,
	});
});

// Edit issue template
apiRouteAdminOrganization.patch("/edit-issue-template", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const {
		org_id: orgId,
		wsClientId,
		id,
		name,
		titlePrefix,
		description,
		status,
		priority,
		categoryId,
		labelIds,
		assigneeIds,
		releaseId,
		visible,
	} = await c.req.json();

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.administrator");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to do that." }, 401);
	}

	const edited = await traceAsync(
		"issueTemplate.edit.update",
		async () => {
			const [template] = await db
				.update(schema.issueTemplate)
				.set({
					name,
					titlePrefix: titlePrefix || null,
					description: description || null,
					status: status || null,
					priority: priority || null,
					categoryId: categoryId || null,
					releaseId: releaseId || null,
					visible: visible || null,
					updatedAt: new Date(),
				})
				.where(and(eq(schema.issueTemplate.id, id), eq(schema.issueTemplate.organizationId, orgId)))
				.returning();
			return template;
		},
		{
			description: "Updating issue template",
			data: { orgId, templateId: id, name },
		}
	);

	if (!edited) {
		await recordWideError({
			name: "issueTemplate.edit.update_failed",
			error: new Error("Failed to edit issue template"),
			code: "ISSUE_TEMPLATE_EDIT_FAILED",
			message: "Failed to edit issue template",
			contextData: { orgId, templateId: id },
		});
		return c.json({ success: false, error: "Failed to edit issue template." }, 500);
	}

	// Update label associations - delete existing and insert new
	await traceAsync(
		"issueTemplate.edit.update_labels",
		async () => {
			await db.delete(schema.issueTemplateLabel).where(eq(schema.issueTemplateLabel.templateId, id));
			if (labelIds && Array.isArray(labelIds) && labelIds.length > 0) {
				await db.insert(schema.issueTemplateLabel).values(
					labelIds.map((labelId: string) => ({
						templateId: id,
						labelId,
					}))
				);
			}
		},
		{ description: "Updating issue template label associations", data: { templateId: id, labelIds } }
	);

	// Update assignee associations - delete existing and insert new
	await traceAsync(
		"issueTemplate.edit.update_assignees",
		async () => {
			await db.delete(schema.issueTemplateAssignee).where(eq(schema.issueTemplateAssignee.templateId, id));
			if (assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length > 0) {
				await db.insert(schema.issueTemplateAssignee).values(
					assigneeIds.map((userId: string) => ({
						templateId: id,
						userId,
					}))
				);
			}
		},
		{ description: "Updating issue template assignee associations", data: { templateId: id, assigneeIds } }
	);

	const templates = await traceAsync("issueTemplate.edit.fetch_all", () => getIssueTemplates(orgId), {
		description: "Fetching all issue templates",
		data: { orgId },
	});

	await traceAsync(
		"issueTemplate.edit.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_ISSUE_TEMPLATES" as WSBaseMessage["type"],
				data: templates,
			};

			broadcast(orgId, "admin", data, found?.socket);

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				broadcastByUserId(member.userId, wsClientId, orgId, data);
			});
		},
		{ description: "Broadcasting issue template update" }
	);

	return c.json({
		success: true,
		data: templates,
	});
});

// Delete issue template
apiRouteAdminOrganization.delete("/delete-issue-template", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, wsClientId, id } = await c.req.json();

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.administrator");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to do that." }, 401);
	}

	const removed = await traceAsync(
		"issueTemplate.delete.remove",
		async () => {
			const [template] = await db
				.delete(schema.issueTemplate)
				.where(and(eq(schema.issueTemplate.id, id), eq(schema.issueTemplate.organizationId, orgId)))
				.returning();
			return template;
		},
		{ description: "Deleting issue template", data: { orgId, templateId: id } }
	);

	if (!removed) {
		await recordWideError({
			name: "issueTemplate.delete.remove_failed",
			error: new Error("Failed to remove issue template"),
			code: "ISSUE_TEMPLATE_DELETION_FAILED",
			message: "Failed to remove issue template",
			contextData: { orgId, templateId: id },
		});
		return c.json({ success: false, error: "Failed to remove issue template." }, 500);
	}

	const templates = await traceAsync("issueTemplate.delete.fetch_all", () => getIssueTemplates(orgId), {
		description: "Fetching all issue templates",
		data: { orgId },
	});

	await traceAsync(
		"issueTemplate.delete.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_ISSUE_TEMPLATES" as WSBaseMessage["type"],
				data: templates,
			};

			broadcast(orgId, "admin", data, found?.socket);

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				broadcastByUserId(member.userId, wsClientId, orgId, data);
			});
		},
		{ description: "Broadcasting issue template update" }
	);

	return c.json({
		success: true,
		data: templates,
	});
});

// Saved View management
// Create saved view with name and filter params
apiRouteAdminOrganization.post("/create-view", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, wsClientId, name, value, logo, slug, viewConfig } = await c.req.json();

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.manageMembers");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to do that." }, 401);
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

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.manageMembers");

	if (!isAuthorized) {
		return c.json(
			{
				success: false,
				error: "You don't have permission to update saved views.",
			},
			401
		);
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
		{
			description: "Updating saved view",
			data: { orgId, viewId: id, name, slug },
		}
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

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.manageMembers");

	if (!isAuthorized) {
		return c.json(
			{
				success: false,
				error: "You don't have permission to delete saved views.",
			},
			401
		);
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

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.administrator");

	if (!isAuthorized) {
		return c.json(
			{
				success: false,
				error: "You don't have permission to sync repositories.",
			},
			401
		);
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
		{
			description: "Checking for existing sync",
			data: { orgId, repoId, installationId },
		}
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
				categoryId: categoryId === "__none__" ? null : categoryId,
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
apiRouteAdminOrganization.patch(
	"/connections/github/sync-repo",
	async (c) => {
		const traceAsync = createTraceAsync();
		const recordWideError =
			c.get("recordWideError");
		const session = c.get("session");

		const {
			org_id: orgId,
			sync_id: syncId,
			repo_id: repoId,
			repo_name: repoName,
			installation_id: installationId,
			category_id: categoryId,
		} = await c.req.json();

		const isAuthorized =
			await traceOrgPermissionCheck(
				session?.userId || "",
				orgId,
				"admin.administrator"
			);

		if (!isAuthorized) {
			return c.json(
				{
					success: false,
					error:
						"You don't have permission to update sync repositories.",
				},
				401
			);
		}

		/* ================= CHECK EXISTS ================= */

		const existingSync =
			await db.query.githubRepository.findFirst(
				{
					where: eq(
						schema.githubRepository.id,
						syncId
					),
				}
			);

		if (!existingSync) {
			return c.json(
				{
					success: false,
					error:
						"Sync connection not found.",
				},
				404
			);
		}

		/* ================= PREVENT DUPLICATES ================= */

		const duplicate =
			await db.query.githubRepository.findFirst(
				{
					where: and(
						eq(
							schema.githubRepository
								.organizationId,
							orgId
						),
						eq(
							schema.githubRepository
								.installationId,
							installationId
						),
						eq(
							schema.githubRepository
								.repoId,
							repoId
						),
						eq(
							schema.githubRepository
								.categoryId,
							categoryId
						),
						// not itself
						ne(
							schema.githubRepository.id,
							syncId
						)
					),
				}
			);

		if (duplicate) {
			await recordWideError({
				name:
					"github.syncRepo.duplicate_update",
				error: new Error(
					"Duplicate sync update"
				),
				code: "SYNC_DUPLICATE",
				message:
					"Another sync with these values already exists",
				contextData: {
					orgId,
					repoId,
					installationId,
					categoryId,
				},
			});

			return c.json(
				{
					success: false,
					error:
						"A sync with these values already exists.",
				},
				400
			);
		}

		/* ================= UPDATE ================= */

		const result = await traceAsync(
			"github.syncRepo.update",
			() =>
				db
					.update(
						schema.githubRepository
					)
					.set({
						installationId,
						repoId,
						repoName,
						categoryId,
					})
					.where(
						eq(
							schema.githubRepository.id,
							syncId
						)
					),
			{
				description:
					"Updating GitHub sync repository",
				data: {
					orgId,
					syncId,
				},
			}
		);

		return c.json({
			success: true,
			data: result,
		});
	}
);
apiRouteAdminOrganization.patch(
	"/connections/github/sync-repo/toggle",
	async (c) => {
		const traceAsync = createTraceAsync();
		const session = c.get("session");

		const {
			org_id: orgId,
			sync_id: syncId,
			enabled,
		} = await c.req.json();

		/* ================= AUTH CHECK ================= */

		const isAuthorized =
			await traceOrgPermissionCheck(
				session?.userId || "",
				orgId,
				"admin.administrator"
			);

		if (!isAuthorized) {
			return c.json(
				{
					success: false,
					error:
						"You don't have permission to modify sync repositories.",
				},
				401
			);
		}

		/* ================= VALIDATE INPUT ================= */

		if (typeof enabled !== "boolean") {
			return c.json(
				{
					success: false,
					error:
						"`enabled` must be true or false.",
				},
				400
			);
		}

		/* ================= CHECK EXISTS ================= */

		const existing =
			await db.query.githubRepository.findFirst(
				{
					where: eq(
						schema.githubRepository.id,
						syncId
					),
				}
			);

		if (!existing) {
			return c.json(
				{
					success: false,
					error:
						"Sync connection not found.",
				},
				404
			);
		}

		/* ================= UPDATE ENABLE STATE ================= */

		const result = await traceAsync(
			"github.syncRepo.toggle_enabled",
			() =>
				db
					.update(
						schema.githubRepository
					)
					.set({
						enabled,
						updatedAt:
							new Date(),
					})
					.where(
						eq(
							schema.githubRepository.id,
							syncId
						)
					),
			{
				description:
					enabled
						? "Enabling GitHub sync repository"
						: "Disabling GitHub sync repository",
				data: {
					orgId,
					syncId,
					enabled,
				},
			}
		);

		return c.json({
			success: true,
			data: result,
		});
	}
);

// team member routes

apiRouteAdminOrganization.post("/member", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, emails }: { org_id: string; emails: string[] } = await c.req.json();

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.administrator");

	if (!isAuthorized) {
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
				data: {
					inviteCount: result.invites.length,
					failedCount: result.failedEmails.length,
				},
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

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.administrator");

	if (!isAuthorized) {
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
apiRouteAdminOrganization.get(
	"/:orgId/connections/github",
	async (c) => {
		const session = c.get("session");
		const orgId = c.req.param("orgId");

		const isAuthorized = await traceOrgPermissionCheck(
			session?.userId || "",
			orgId,
			"admin.administrator"
		);

		if (!isAuthorized) {
			return c.json(
				{
					success: false,
					error:
						"You don't have permission to fetch connections.",
				},
				401
			);
		}

		/* ================= INSTALLATIONS ================= */

		const installationLinks =
			await db.query.githubInstallationOrg.findMany({
				where: eq(
					schema.githubInstallationOrg.organizationId,
					orgId
				),
				with: {
					installation: {
						with: { user: true },
					},
				},
			});

		/* ================= FETCH GITHUB DETAILS ================= */

		const githubConnections = await Promise.all(
			installationLinks.map(async (link) => {
				// ✅ Fetch repos ONLY for this install
				const syncedRepos =
					await db.query.githubRepository.findMany({
						where: eq(
							schema.githubRepository.installationId,
							link.installationId
						),
					});

				const githubInfo =
					await getInstallationDetailsWithRepos(
						link.installation,
						link.organizationId,
						syncedRepos
					);

				return {
					installation: link.installation,
					githubInfo,
				};
			})
		);
		/* ================= ALL SYNCED REPOS ================= */

		const repositories =
			await db.query.githubRepository.findMany(
				{
					where: eq(
						schema.githubRepository
							.organizationId,
						orgId
					),
				}
			);
		return c.json({
			success: true,
			data: {
				githubConnections,
				repositories
			},
		});
	}
);


apiRouteAdminOrganization.delete(
	"/connections/github/sync-repo",
	async (c) => {
		const traceAsync = createTraceAsync();
		const session = c.get("session");

		const {
			org_id: orgId,
			sync_id: syncId,
		} = await c.req.json();

		const isAuthorized =
			await traceOrgPermissionCheck(
				session?.userId || "",
				orgId,
				"admin.administrator"
			);

		if (!isAuthorized) {
			return c.json(
				{
					success: false,
					error:
						"You don't have permission to delete sync repositories.",
				},
				401
			);
		}

		/* ================= CHECK EXISTS ================= */

		const existing =
			await db.query.githubRepository.findFirst(
				{
					where: eq(
						schema.githubRepository.id,
						syncId
					),
				}
			);

		if (!existing) {
			return c.json(
				{
					success: false,
					error:
						"Sync connection not found.",
				},
				404
			);
		}

		/* ================= DELETE ================= */

		const result = await traceAsync(
			"github.syncRepo.delete",
			() =>
				db
					.delete(
						schema.githubRepository
					)
					.where(
						eq(
							schema.githubRepository.id,
							syncId
						)
					),
			{
				description:
					"Deleting GitHub sync repository",
				data: {
					orgId,
					syncId,
				},
			}
		);

		return c.json({
			success: true,
			data: result,
		});
	}
);
apiRouteAdminOrganization.get(
	"/:orgId/github/installations",
	async (c) => {
		const session = c.get("session");
		const orgId = c.req.param("orgId");

		if (!session?.userId) {
			return c.json(
				{ success: false, error: "Unauthorized." },
				401
			);
		}

		const isAuthorized =
			await traceOrgPermissionCheck(
				session.userId,
				orgId,
				"admin.administrator"
			);

		if (!isAuthorized) {
			return c.json(
				{
					success: false,
					error:
						"You don't have permission to view installations.",
				},
				401
			);
		}

		/* ================= GET GITHUB ACCOUNT ================= */


		let githubAccount = await db.query.account.findFirst({
			where: and(
				eq(auth.account.userId, session.userId),
				eq(auth.account.providerId, "github")
			),
		});

		if (!githubAccount?.accessToken) {
			return c.json(
				{
					success: false,
					error:
						"GitHub account not connected. Please sign in with GitHub.",
				},
				400
			);
		}

		/* ================= REFRESH TOKEN IF NEEDED ================= */

		githubAccount = await refreshGitHubTokenIfNeeded(githubAccount);

		/* ================= CALL GITHUB API ================= */

		try {
			const octokit = new Octokit({
				auth: githubAccount.accessToken!,
			});

			const response = await octokit.request("GET /user/installations");

			const appId = Number(process.env.GITHUB_APP_ID);

			const filteredInstallations =
				response.data.installations.filter(
					(install) => install.app_id === appId
				);

			return c.json({
				success: true,
				data: filteredInstallations,
			});
		} catch (error: any) {
			/* ⭐ Important fallback:
			   If GitHub says token invalid → force refresh once */
			if (error?.status === 401 && githubAccount.refreshToken) {
				const refreshed = await refreshGitHubTokenIfNeeded({
					...githubAccount,
					accessTokenExpiresAt: new Date(0),
				});

				const octokit = new Octokit({
					auth: refreshed.accessToken!,
				});

				const response = await octokit.request("GET /user/installations");

				const appId = Number(process.env.GITHUB_APP_ID);

				const filteredInstallations =
					response.data.installations.filter(
						(install) => install.app_id === appId
					);

				return c.json({
					success: true,
					data: filteredInstallations,
				});
			}

			console.error("Failed to fetch GitHub installations:", error);

			return c.json(
				{
					success: false,
					error: "Failed to fetch GitHub installations.",
				},
				500
			);
		}
	}
);

apiRouteAdminOrganization.post(
	"/:orgId/github/link",
	async (c) => {
		const session = c.get("session");
		const orgId = c.req.param("orgId");

		if (!session?.userId) {
			return c.json(
				{ success: false, error: "Unauthorized." },
				401
			);
		}

		const isAuthorized = await traceOrgPermissionCheck(
			session.userId,
			orgId,
			"admin.administrator"
		);

		if (!isAuthorized) {
			return c.json(
				{
					success: false,
					error: "You don't have permission to link installations.",
				},
				401
			);
		}

		/* ================= VALIDATE BODY ================= */

		const body = await c.req.json().catch(() => null);

		const installationId = Number(body?.installationId);

		if (!installationId || Number.isNaN(installationId)) {
			return c.json(
				{
					success: false,
					error: "Invalid installationId.",
				},
				400
			);
		}

		/* ================= GET GITHUB ACCOUNT ================= */

		let githubAccount = await db.query.account.findFirst({
			where: and(
				eq(auth.account.userId, session.userId),
				eq(auth.account.providerId, "github")
			),
		});

		if (!githubAccount?.accessToken) {
			return c.json(
				{
					success: false,
					error:
						"GitHub account not connected. Please sign in with GitHub.",
				},
				400
			);
		}

		/* ================= REFRESH TOKEN IF NEEDED ================= */

		githubAccount = await refreshGitHubTokenIfNeeded(githubAccount);

		/* ================= VERIFY INSTALLATION WITH GITHUB ================= */

		try {
			const octokit = new Octokit({
				auth: githubAccount.accessToken!,
			});

			// Fetch specific installation
			const installation = await octokit.request(
				"GET /user/installations"
			);

			const appId = Number(process.env.GITHUB_APP_ID);

			const validInstallation =
				installation.data.installations.find(
					(i) =>
						i.id === installationId &&
						i.app_id === appId
				);

			if (!validInstallation) {
				return c.json(
					{
						success: false,
						error:
							"Installation not found or does not belong to this app.",
					},
					400
				);
			}

			/* ================= PREVENT DUPLICATE LINK ================= */

			const existing =
				await db.query.githubInstallationOrg.findFirst({
					where: and(
						eq(
							schema.githubInstallationOrg.installationId,
							installationId
						),
						eq(
							schema.githubInstallationOrg.organizationId,
							orgId
						)
					),
				});

			if (existing) {
				return c.json({
					success: true,
					message: "Installation already linked.",
				});
			}

			/* ================= INSERT JUNCTION ROW ================= */

			await db.insert(schema.githubInstallationOrg).values({
				id: crypto.randomUUID(),
				installationId,
				organizationId: orgId,
				userId: session.userId,
				createdAt: new Date(),
			});

			return c.json({
				success: true,
			});
		} catch (error: any) {
			console.error("Failed to link GitHub installation:", error);

			if (error?.status === 401) {
				return c.json(
					{
						success: false,
						error:
							"GitHub authentication expired. Please reconnect your account.",
					},
					401
				);
			}

			return c.json(
				{
					success: false,
					error: "Failed to link installation.",
				},
				500
			);
		}
	}
);
apiRouteAdminOrganization.post(
	"/:orgId/github/unlink",
	async (c) => {
		const session = c.get("session");
		const orgId = c.req.param("orgId");

		if (!session?.userId) {
			return c.json(
				{ success: false, error: "Unauthorized." },
				401
			);
		}

		const isAuthorized = await traceOrgPermissionCheck(
			session.userId,
			orgId,
			"admin.administrator"
		);

		if (!isAuthorized) {
			return c.json(
				{
					success: false,
					error: "You don't have permission to unlink installations.",
				},
				401
			);
		}

		/* ================= VALIDATE BODY ================= */

		const body = await c.req.json().catch(() => null);
		const installationId = Number(body?.installationId);

		if (!installationId || Number.isNaN(installationId)) {
			return c.json(
				{ success: false, error: "Invalid installationId." },
				400
			);
		}

		try {
			/* ================= DELETE REPOSITORIES ================= */
			await db
				.delete(schema.githubRepository)
				.where(
					and(
						eq(schema.githubRepository.installationId, installationId),
						eq(schema.githubRepository.organizationId, orgId)
					)
				);

			/* ================= DELETE JUNCTION ================= */
			await db
				.delete(schema.githubInstallationOrg)
				.where(
					and(
						eq(
							schema.githubInstallationOrg.installationId,
							installationId
						),
						eq(
							schema.githubInstallationOrg.organizationId,
							orgId
						)
					)
				);

			return c.json({
				success: true,
			});
		} catch (error) {
			console.error("Failed to unlink installation:", error);

			return c.json(
				{
					success: false,
					error: "Failed to unlink installation.",
				},
				500
			);
		}
	}
);

// Teams
apiRouteAdminOrganization.post("/team", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, name, description, permissions } = await c.req.json();

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.manageTeams");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to create teams." }, 401);
	}

	const teamPermissions: TeamPermissions = permissions
		? {
			admin: { ...defaultTeamPermissions.admin, ...permissions.admin },
			content: { ...defaultTeamPermissions.content, ...permissions.content },
			tasks: { ...defaultTeamPermissions.tasks, ...permissions.tasks },
			moderation: {
				...defaultTeamPermissions.moderation,
				...permissions.moderation,
			},
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

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.manageTeams");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to edit teams." }, 401);
	}

	const teamPermissions: TeamPermissions = permissions
		? {
			admin: { ...defaultTeamPermissions.admin, ...permissions.admin },
			content: { ...defaultTeamPermissions.content, ...permissions.content },
			tasks: { ...defaultTeamPermissions.tasks, ...permissions.tasks },
			moderation: {
				...defaultTeamPermissions.moderation,
				...permissions.moderation,
			},
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

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.manageTeams");

	if (!isAuthorized) {
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

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.manageTeams");

	if (!isAuthorized) {
		return c.json(
			{
				success: false,
				error: "You don't have permission to add members to teams.",
			},
			401
		);
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

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.manageTeams");

	if (!isAuthorized) {
		return c.json(
			{
				success: false,
				error: "You don't have permission to remove members from teams.",
			},
			401
		);
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
		{
			description: "Removing member from team",
			data: { orgId, teamId, memberId },
		}
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
apiRouteAdminOrganization.post(
	"/bootstrap-admin-team",
	async (c) => {
		const traceAsync = createTraceAsync();
		const recordWideError = c.get("recordWideError");

		const session = c.get("session");
		if (!session?.userId) {
			return c.json(
				{ success: false, error: "UNAUTHORIZED" },
				401
			);
		}

		const body = await c.req.json().catch(() => null);
		const { org_id: orgId }: { org_id?: string } = body ?? {};

		if (!orgId) {
			return c.json(
				{ success: false, error: "Invalid organization" },
				400
			);
		}

		const membership = await traceAsync(
			"team.bootstrap.membership_check",
			() =>
				db.query.member.findFirst({
					where: and(
						eq(schema.member.organizationId, orgId),
						eq(schema.member.userId, session.userId)
					),
				}),
			{
				description: "Checking user membership",
				data: {
					user: { id: session.userId },
					organization: { id: orgId },
				},
			}
		);

		if (!membership) {
			await recordWideError({
				name: "team.bootstrap.auth",
				error: new Error("Unauthorized"),
				code: "UNAUTHORIZED",
				message:
					"User is not a member of this organization",
				contextData: {
					user: { id: session.userId },
					organization: { id: orgId },
				},
			});

			return c.json(
				{
					success: false,
					error:
						"You must be a member of this organization.",
				},
				401
			);
		}

		const adminTeam = await traceAsync(
			"team.bootstrap.create",
			() => bootstrapOrganizationAdminTeam(orgId),
			{
				description: "Bootstrapping admin team",
				data: {
					user: { id: session.userId },
					organization: { id: orgId },
				},
				onSuccess: (team) => ({
					outcome: "Admin team bootstrapped",
					data: {
						team: { id: team.id },
					},
				}),
			}
		);

		if (!adminTeam) {
			await recordWideError({
				name: "team.bootstrap.failed",
				error: new Error("Bootstrap failed"),
				code: "BOOTSTRAP_FAILED",
				message: "Failed to create admin team",
				contextData: {
					organization: { id: orgId },
				},
			});

			return c.json(
				{
					success: false,
					error: "Failed to create admin team.",
				},
				500
			);
		}

		// ✅ Success “event” captured as a traced span
		await traceAsync(
			"team.bootstrap.success",
			async () => { },
			{
				description:
					"Admin team bootstrapped successfully",
				data: {
					user: { id: session.userId },
					organization: { id: orgId },
					team: { id: adminTeam.id },
				},
			}
		);

		return c.json({ success: true, data: adminTeam });
	}
);

// Search organization members (for @mention autocomplete)
apiRouteAdminOrganization.get("/:orgId/members/search", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const orgId = c.req.param("orgId");
	const query = c.req.query("query");
	const limitParam = c.req.query("limit");
	const limit = limitParam ? Number.parseInt(limitParam, 10) : 20;

	if (!session?.userId) {
		return c.json({ success: false, error: "Not authenticated" }, 401);
	}

	// Verify the requesting user is a member of this org
	const isMember = await traceAsync(
		"members.search.check_membership",
		() =>
			db.query.member.findFirst({
				where: and(
					eq(schema.member.organizationId, orgId),
					eq(schema.member.userId, session.userId),
				),
			}),
		{ description: "Checking membership for member search", data: { orgId, userId: session.userId } }
	);

	if (!isMember) {
		return c.json({ success: false, error: "Not a member of this organization" }, 403);
	}

	const members = await traceAsync(
		"members.search.query",
		() => searchOrgMembers(orgId, { query: query || undefined, limit }),
		{
			description: "Searching organization members",
			data: { orgId, query, limit },
		}
	);

	return c.json({ success: true, data: members });
});

// ═══════════════════════════════════════════════════════════════════════════
//  BLOCKED USERS
// ═══════════════════════════════════════════════════════════════════════════

// List all blocked users for an organization
apiRouteAdminOrganization.get("/:orgId/blocked-users", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const orgId = c.req.param("orgId");

	if (!session?.userId) {
		return c.json({ success: false, error: "Not authenticated" }, 401);
	}

	const isAuthorized = await traceOrgPermissionCheck(session.userId, orgId, "admin.administrator");
	if (!isAuthorized) {
		return c.json({ success: false, error: "Permission denied" }, 401);
	}

	try {
		const blocked = await traceAsync(
			"blockedUsers.list",
			() => getBlockedUsers(orgId),
			{ description: "Listing blocked users", data: { orgId } },
		);

		return c.json({ success: true, data: blocked });
	} catch (err) {
		await recordWideError({
			name: "blockedUsers.list.failed",
			error: err,
			code: "BLOCKED_USERS_LIST_FAILED",
			message: "Failed to list blocked users",
			contextData: { orgId },
		});
		return c.json({ success: false, error: "Failed to list blocked users" }, 500);
	}
});

// Search for users who've interacted with the org (non-members) to block
apiRouteAdminOrganization.get("/:orgId/blocked-users/search", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const orgId = c.req.param("orgId");
	const query = c.req.query("query");
	const limitParam = c.req.query("limit");
	const limit = limitParam ? Number.parseInt(limitParam, 10) : 20;

	if (!session?.userId) {
		return c.json({ success: false, error: "Not authenticated" }, 401);
	}

	const isAuthorized = await traceOrgPermissionCheck(session.userId, orgId, "admin.administrator");
	if (!isAuthorized) {
		return c.json({ success: false, error: "Permission denied" }, 401);
	}

	try {
		const users = await traceAsync(
			"blockedUsers.search",
			() => searchOrgInteractors(orgId, { query: query || undefined, limit }),
			{ description: "Searching org interactors for block", data: { orgId, query, limit } },
		);

		return c.json({ success: true, data: users });
	} catch (err) {
		await recordWideError({
			name: "blockedUsers.search.failed",
			error: err,
			code: "BLOCKED_USERS_SEARCH_FAILED",
			message: "Failed to search interactors",
			contextData: { orgId, query },
		});
		return c.json({ success: false, error: "Failed to search users" }, 500);
	}
});

// Block a user from an organization
apiRouteAdminOrganization.post("/:orgId/blocked-users", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const orgId = c.req.param("orgId");

	if (!session?.userId) {
		return c.json({ success: false, error: "Not authenticated" }, 401);
	}

	const isAuthorized = await traceOrgPermissionCheck(session.userId, orgId, "admin.administrator");
	if (!isAuthorized) {
		return c.json({ success: false, error: "Permission denied" }, 401);
	}

	const { userId, reason } = await c.req.json();

	if (!userId) {
		return c.json({ success: false, error: "userId is required" }, 400);
	}

	// Prevent blocking org members
	const isMember = await traceAsync(
		"blockedUsers.block.checkMembership",
		() =>
			db.query.member.findFirst({
				where: and(
					eq(schema.member.organizationId, orgId),
					eq(schema.member.userId, userId),
				),
			}),
		{ description: "Checking if target user is an org member", data: { orgId, userId } },
	);

	if (isMember) {
		return c.json({ success: false, error: "Cannot block an organization member" }, 400);
	}

	try {
		const blocked = await traceAsync(
			"blockedUsers.block",
			() => blockUser(orgId, userId, session.userId, reason),
			{ description: "Blocking user from org", data: { orgId, userId, blockedBy: session.userId } },
		);

		if (!blocked) {
			return c.json({ success: false, error: "User is already blocked" }, 409);
		}

		return c.json({ success: true, data: blocked });
	} catch (err) {
		await recordWideError({
			name: "blockedUsers.block.failed",
			error: err,
			code: "BLOCK_USER_FAILED",
			message: "Failed to block user",
			contextData: { orgId, userId },
		});
		return c.json({ success: false, error: "Failed to block user" }, 500);
	}
});

// Unblock a user from an organization
apiRouteAdminOrganization.delete("/:orgId/blocked-users", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const orgId = c.req.param("orgId");

	if (!session?.userId) {
		return c.json({ success: false, error: "Not authenticated" }, 401);
	}

	const isAuthorized = await traceOrgPermissionCheck(session.userId, orgId, "admin.administrator");
	if (!isAuthorized) {
		return c.json({ success: false, error: "Permission denied" }, 401);
	}

	const { userId } = await c.req.json();

	if (!userId) {
		return c.json({ success: false, error: "userId is required" }, 400);
	}

	try {
		const removed = await traceAsync(
			"blockedUsers.unblock",
			() => unblockUser(orgId, userId),
			{ description: "Unblocking user from org", data: { orgId, userId } },
		);

		if (!removed) {
			return c.json({ success: false, error: "User was not blocked" }, 404);
		}

		return c.json({ success: true, data: { userId, orgId } });
	} catch (err) {
		await recordWideError({
			name: "blockedUsers.unblock.failed",
			error: err,
			code: "UNBLOCK_USER_FAILED",
			message: "Failed to unblock user",
			contextData: { orgId, userId },
		});
		return c.json({ success: false, error: "Failed to unblock user" }, 500);
	}
});

// Get blocked user IDs for an organization (member-level access for comment filtering)
apiRouteAdminOrganization.get("/:orgId/blocked-user-ids", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const orgId = c.req.param("orgId");

	if (!session?.userId) {
		return c.json({ success: false, error: "Not authenticated" }, 401);
	}

	const isMember = await traceOrgPermissionCheck(session.userId, orgId, "members");
	if (!isMember) {
		return c.json({ success: false, error: "Permission denied" }, 401);
	}

	try {
		const blockedIds = await traceAsync(
			"blockedUsers.listIds",
			() => getBlockedUserIds(orgId),
			{ description: "Listing blocked user IDs for comment filtering", data: { orgId } },
		);

		return c.json({ success: true, data: blockedIds });
	} catch (err) {
		await recordWideError({
			name: "blockedUsers.listIds.failed",
			error: err,
			code: "BLOCKED_USER_IDS_LIST_FAILED",
			message: "Failed to list blocked user IDs",
			contextData: { orgId },
		});
		return c.json({ success: false, error: "Failed to list blocked user IDs" }, 500);
	}
});

// Task routes
apiRouteAdminOrganization.route("/task", apiRouteAdminProjectTask);
