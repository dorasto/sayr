import { randomBytes, randomUUID } from "node:crypto";
import { db, getLabels, getOrganizationMembers, hasOrgPermission, schema } from "@repo/database";
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
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Create organization requested";
	if (!session?.userId) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User not authenticated",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
	}

	const { name, slug, description } = await c.req.json();

	if (!name || !slug) {
		wideEvent.error = {
			type: "ValidationError",
			code: "InvalidRequest",
			message: "Name and slug are required",
		};
		return c.json({ success: false, error: "Name and slug are required" }, 400);
	}

	// Check if slug is already taken
	const existingOrg = await db.query.organization.findFirst({
		where: eq(schema.organization.slug, slug),
	});

	if (existingOrg) {
		wideEvent.error = {
			type: "ValidationError",
			code: "SlugTaken",
			message: "Organization slug is already taken",
		};
		return c.json({ success: false, error: "Organization slug is already taken" }, 400);
	}

	const orgId = randomUUID();

	// Create the organization
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
		wideEvent.error = {
			type: "DatabaseError",
			code: "OrgCreationFailed",
			message: "Failed to create organization",
		};
		return c.json({ success: false, error: "Failed to create organization" }, 500);
	}

	// Add the creator as an owner member
	const [membership] = await db
		.insert(schema.member)
		.values({
			id: randomUUID(),
			userId: session.userId,
			organizationId: orgId,
		})
		.returning();

	if (!membership) {
		// Rollback organization creation if membership fails
		wideEvent.error = {
			type: "DatabaseError",
			code: "MembershipCreationFailed",
			message: "Failed to create organization membership",
		};
		await db.delete(schema.organization).where(eq(schema.organization.id, orgId));
		return c.json({ success: false, error: "Failed to create organization membership" }, 500);
	}
	wideEvent.organizationCreation = {
		organizationId: orgId,
		createdByUserId: session.userId,
	};
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
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Update organization requested";
	const { org_id, wsClientId, data } = await c.req.json();
	const session = c.get("session");
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "members");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to update organization",
		};
		return c.json({ error: "You don’t have permission to do that." }, 401);
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
		const data = {
			type: "UPDATE_ORG" as WSBaseMessage["type"],
			data: {
				...result,
				logo: result.logo ? ensureCdnUrl(result.logo) : null,
				bannerImg: result.bannerImg ? ensureCdnUrl(result.bannerImg) : null,
			},
		};
		broadcast(org_id, "admin", data, found?.socket);
		broadcastPublic(org_id, {
			...data,
			data: { ...data.data, privateId: null },
		});
		const members = await getOrganizationMembers(org_id);
		members.forEach((member) => {
			broadcastByUserId(member.userId, wsClientId, org_id, data, "");
		});
		wideEvent.organizationUpdate = {
			organizationId: org_id,
			updatedByUserId: session?.userId || "",
		};
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
		const wideEvent = c.get("wideEvent");
		wideEvent.description = "Organization logo upload requested";
		const session = c.get("session");
		const orgId = c.req.param("orgId");
		const oldLogo = c.req.header("X-old-file");

		const isAuthorized = await hasOrgPermission(session?.userId || "", orgId, "members");
		if (!isAuthorized) {
			wideEvent.error = {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to upload organization logo",
			};
			return c.json({ error: "You don’t have permission to do that." }, 401);
		}

		// 2. Parse multipart body
		const body = await c.req.parseBody();
		const file = body.file;
		if (!file || !(file instanceof File)) {
			wideEvent.error = {
				type: "ValidationError",
				code: "NoFileUploaded",
				message: "No file uploaded for organization logo",
			};
			return c.text("No file uploaded", 400);
		}

		const buffer = Buffer.from(await file.arrayBuffer());

		// Preserve the original extension based on file name or MIME
		const ext = file.name.split(".").pop() || file.type.split("/")[1] || "png";
		const objectName = `/logo.${ext}`;
		if (oldLogo) {
			wideEvent.previousLogoRemoval = {
				organizationId: orgId,
				removedByUserId: session?.userId || "",
			};
			await removeObject(`organization/${orgId}/${getFileNameFromUrl(oldLogo)}`);
		}
		// 3. Upload to storage
		const imagelogo = await uploadObject(objectName, buffer, `organization/${orgId}`, {
			"Content-Type": file.type || "application/octet-stream",
			originalName: objectName,
		});
		wideEvent.organizationLogoUpload = {
			organizationId: orgId,
			uploadedByUserId: session?.userId || "",
		};
		// 4. Build result payload
		return c.json({
			success: true,
			orgId,
			originalName: file.name,
			image: imagelogo, // this should be the stored URL or object path
		});
		// biome-ignore lint/suspicious/noExplicitAny: <test>
	} catch (err: any) {
		console.error("Upload failed:", err.message);
		return c.text("Upload failed", 500);
	}
});

// Upload organization banner
apiRouteAdminOrganization.put("/:orgId/banner", async (c) => {
	try {
		const wideEvent = c.get("wideEvent");
		wideEvent.description = "Organization banner upload requested";
		const session = c.get("session");
		const orgId = c.req.param("orgId");
		const oldBanner = c.req.header("X-old-file");

		const isAuthorized = await hasOrgPermission(session?.userId || "", orgId, "members");
		if (!isAuthorized) {
			wideEvent.error = {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User does not have permission to upload organization banner",
			};
			return c.json({ error: "You don’t have permission to do that." }, 401);
		}

		// 2. Parse multipart body
		const body = await c.req.parseBody();
		const file = body.file;
		if (!file || !(file instanceof File)) {
			wideEvent.error = {
				type: "ValidationError",
				code: "NoFileUploaded",
				message: "No file uploaded for organization banner",
			};
			return c.text("No file uploaded", 400);
		}

		const buffer = Buffer.from(await file.arrayBuffer());

		// Preserve the original extension based on file name or MIME
		const ext = file.name.split(".").pop() || file.type.split("/")[1] || "png";
		const objectName = `banner.${ext}`;
		if (oldBanner) {
			wideEvent.previousBannerRemoval = {
				organizationId: orgId,
				removedByUserId: session?.userId || "",
			};
			await removeObject(`organization/${orgId}/${getFileNameFromUrl(oldBanner)}`);
		}
		// 3. Upload to storage
		const imagebanner = await uploadObject(objectName, buffer, `organization/${orgId}`, {
			"Content-Type": file.type || "application/octet-stream",
			originalName: objectName,
		});
		wideEvent.organizationBannerUpload = {
			organizationId: orgId,
			uploadedByUserId: session?.userId || "",
		};
		// 4. Build result payload
		return c.json({
			success: true,
			orgId,
			originalName: file.name,
			image: imagebanner, // this should be the stored URL or object path
		});
		// biome-ignore lint/suspicious/noExplicitAny: <test>
	} catch (err: any) {
		console.error("Upload failed:", err.message);
		return c.text("Upload failed", 500);
	}
});

// Label management
// Create label with name and color
apiRouteAdminOrganization.post("/create-label", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Create label requested";
	const session = c.get("session");
	const { org_id, wsClientId, name, color } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "labels");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to create labels",
		};
		//fix this wording for dont have the permission
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
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
		wideEvent.error = {
			type: "DatabaseError",
			code: "LabelCreationFailed",
			message: "Failed to create label",
		};
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
	wideEvent.labelCreation = {
		organizationId: org_id,
		labelId: created.id,
		createdByUserId: session?.userId || "",
	};
	return c.json({
		success: true,
		data: labels,
	});
});
// Edit label name and color
apiRouteAdminOrganization.patch("/edit-label", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Edit label requested";
	const session = c.get("session");
	const { org_id, wsClientId, id, name, color } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "labels");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to edit labels",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
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
		wideEvent.error = {
			type: "DatabaseError",
			code: "LabelEditFailed",
			message: "Failed to edit label",
		};
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
	wideEvent.labelEdit = {
		organizationId: org_id,
		labelId: edit.id,
		editedByUserId: session?.userId || "",
	};
	return c.json({
		success: true,
		data: labels,
	});
});
// Delete label by label ID
apiRouteAdminOrganization.delete("/delete-label", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Delete label requested";
	const session = c.get("session");
	const { org_id, wsClientId, id } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "labels");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to delete labels",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
	}
	const [removed] = await db
		.delete(schema.label)
		.where(and(eq(schema.label.id, id), eq(schema.label.organizationId, org_id), eq(schema.label.id, id)))
		.returning();
	if (!removed) {
		wideEvent.error = {
			type: "DatabaseError",
			code: "LabelDeletionFailed",
			message: "Failed to remove label",
		};
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
	wideEvent.labelDeletion = {
		organizationId: org_id,
		labelId: removed.id,
		deletedByUserId: session?.userId || "",
	};
	return c.json({
		success: true,
		data: labels,
	});
});

// Category management
// Create category with name, color, and icon
apiRouteAdminOrganization.post("/create-category", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Create category requested";
	const session = c.get("session");
	const { org_id, wsClientId, name, color, icon } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "categories");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to create categories",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
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
		wideEvent.error = {
			type: "DatabaseError",
			code: "CategoryCreationFailed",
			message: "Failed to create category",
		};
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
	wideEvent.categoryCreation = {
		organizationId: org_id,
		categoryId: created.id,
		createdByUserId: session?.userId || "",
	};
	return c.json({
		success: true,
		data: categories,
	});
});
// Edit category name, color, and icon
apiRouteAdminOrganization.patch("/edit-category", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Edit category requested";
	const session = c.get("session");
	const { org_id, wsClientId, id, name, color, icon } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "categories");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to edit categories",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
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
		wideEvent.error = {
			type: "DatabaseError",
			code: "CategoryEditFailed",
			message: "Failed to edit category",
		};
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
	wideEvent.categoryEdit = {
		organizationId: org_id,
		categoryId: edit.id,
		editedByUserId: session?.userId || "",
	};
	return c.json({
		success: true,
		data: categories,
	});
});
// Delete category by category ID
apiRouteAdminOrganization.delete("/delete-category", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Delete category requested";
	const session = c.get("session");
	const { org_id, wsClientId, id } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "categories");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to delete categories",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
	}
	const [removed] = await db
		.delete(schema.category)
		.where(and(eq(schema.category.id, id), eq(schema.category.organizationId, org_id), eq(schema.category.id, id)))
		.returning();
	if (!removed) {
		wideEvent.error = {
			type: "DatabaseError",
			code: "CategoryDeletionFailed",
			message: "Failed to remove category",
		};
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
	wideEvent.categoryDeletion = {
		organizationId: org_id,
		categoryId: removed.id,
		deletedByUserId: session?.userId || "",
	};
	return c.json({
		success: true,
		data: categories,
	});
});

// Saved View management
// Create saved view with name and filter params
apiRouteAdminOrganization.post("/create-view", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Create saved view requested";
	const session = c.get("session");
	const { org_id, wsClientId, name, value, logo, slug, viewConfig } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "members");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to create saved views",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
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
		wideEvent.error = {
			type: "DatabaseError",
			code: "SavedViewCreationFailed",
			message: "Failed to create saved view",
		};
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
	wideEvent.savedViewCreation = {
		organizationId: org_id,
		savedViewId: view.id,
		createdByUserId: session?.userId || "",
	};
	return c.json({
		success: true,
		data: views,
	});
});

// Update saved view
apiRouteAdminOrganization.patch("/update-view", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Update saved view requested";
	const session = c.get("session");
	const { org_id, wsClientId, id, name, value, viewConfig, logo, slug } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "members");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to update saved views",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
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
		wideEvent.error = {
			type: "DatabaseError",
			code: "SavedViewUpdateFailed",
			message: "Failed to update saved view",
		};
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
	wideEvent.savedViewUpdate = {
		organizationId: org_id,
		savedViewId: view.id,
		updatedByUserId: session?.userId || "",
	};
	return c.json({
		success: true,
		data: views,
	});
});

// Delete saved view
apiRouteAdminOrganization.delete("/delete-view", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Delete saved view requested";
	const session = c.get("session");
	const { org_id, wsClientId, id } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "members");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to delete saved views",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
	}
	const [removed] = await db
		.delete(schema.savedView)
		.where(and(eq(schema.savedView.id, id), eq(schema.savedView.organizationId, org_id)))
		.returning();
	if (!removed) {
		wideEvent.error = {
			type: "DatabaseError",
			code: "SavedViewDeletionFailed",
			message: "Failed to remove saved view",
		};
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
	wideEvent.savedViewDeletion = {
		organizationId: org_id,
		savedViewId: removed.id,
		deletedByUserId: session?.userId || "",
	};
	return c.json({
		success: true,
		data: views,
	});
});
apiRouteAdminOrganization.post("/connections/github/sync-repo", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Sync GitHub repository requested";
	const session = c.get("session");
	const { org_id, repo_id, repo_name, installation_id, category_id } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "administrator");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to sync GitHub repositories",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
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
		wideEvent.error = {
			type: "ValidationError",
			code: "RepoAlreadySynced",
			message: "Repository is already synced with this organization",
		};
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
	wideEvent.githubRepoSync = {
		organizationId: org_id,
		repoId: repo_id,
		syncedByUserId: session?.userId || "",
	};
	return c.json({
		success: true,
		data: result,
	});
});

//team member routes

apiRouteAdminOrganization.post("/member", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Invite members requested";
	const session = c.get("session");
	const { org_id, emails }: { org_id: string; emails: string[] } = await c.req.json();

	// --- Permissions ---
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "administrator");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to invite members",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
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
	wideEvent.memberInvites = {
		organizationId: org_id,
		invitedByUserId: session?.userId || "",
		numberOfInvites: invites.length,
	};
	return c.json({
		success: true,
		invites,
		...(failedEmails.length > 0 && { errors: failedEmails }),
	});
});

apiRouteAdminOrganization.delete("/member", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Remove member requested";
	const session = c.get("session");
	const { org_id, user_id } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "administrator");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to remove members",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
	}
	const [removed] = await db
		.delete(schema.member)
		.where(and(eq(schema.member.organizationId, org_id), eq(schema.member.userId, user_id)))
		.returning();
	if (!removed) {
		wideEvent.error = {
			type: "DatabaseError",
			code: "MemberRemovalFailed",
			message: "Failed to remove member",
		};
		return c.json({ success: false, error: "Failed to remove member." }, 500);
	}
	broadcastByUserId(user_id, "", org_id, {
		type: "MEMBER_ACTIONS",
		data: { orgId: org_id, userId: user_id, action: "REMOVED" },
	});
	wideEvent.memberRemoval = {
		organizationId: org_id,
		removedUserId: user_id,
		removedByUserId: session?.userId || "",
	};
	return c.json({
		success: true,
		// data: removed,
	});
});

// Get GitHub connection details
apiRouteAdminOrganization.get("/:orgId/connections/github", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Fetch GitHub connections requested";
	const orgId = c.req.param("orgId");
	const session = c.get("session");
	const isAuthorized = await hasOrgPermission(session?.userId || "", orgId, "administrator");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to fetch GitHub connections",
		};
		return c.json({ error: "You don’t have permission to do that." }, 401);
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
	wideEvent.githubConnectionsFetch = {
		organizationId: orgId,
		fetchedByUserId: session?.userId || "",
		numberOfConnections: githubConnections.length,
	};
	return c.json({
		success: true,
		data: {
			githubInfo,
			githubConnections,
		},
	});
});

//Teams
apiRouteAdminOrganization.post("/team", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Create team requested";
	const session = c.get("session");
	const { org_id, name, description, permissions } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "teams");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to create teams",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
	}
	const [team] = await db
		.insert(schema.team)
		.values({
			id: crypto.randomUUID(),
			organizationId: org_id,
			name,
			description,
			permissions: {
				administrator: permissions?.administrator || false,
				members: permissions?.members || false,
				teams: permissions?.teams || false,
				categories: permissions?.categories || false,
				labels: permissions?.labels || false,
			},
		})
		.returning();
	if (!team) {
		wideEvent.error = {
			type: "DatabaseError",
			code: "TeamCreationFailed",
			message: "Failed to create team",
		};
		return c.json({ success: false, error: "Failed to create team." }, 500);
	}
	wideEvent.teamCreation = {
		organizationId: org_id,
		teamId: team.id,
		createdByUserId: session?.userId || "",
	};
	return c.json({
		success: true,
		data: team,
	});
});
apiRouteAdminOrganization.patch("/team", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Edit team requested";
	const session = c.get("session");
	const { org_id, team_id, name, description, permissions } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "teams");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to edit teams",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
	}
	const [team] = await db
		.update(schema.team)
		.set({
			name,
			description,
			permissions: {
				administrator: permissions?.administrator || false,
				members: permissions?.members || false,
				teams: permissions?.teams || false,
				categories: permissions?.categories || false,
				labels: permissions?.labels || false,
			},
			updatedAt: new Date(),
		})
		.where(and(eq(schema.team.id, team_id), eq(schema.team.organizationId, org_id)))
		.returning();
	if (!team) {
		wideEvent.error = {
			type: "DatabaseError",
			code: "TeamEditFailed",
			message: "Failed to edit team",
		};
		return c.json({ success: false, error: "Failed to edit team." }, 500);
	}
	wideEvent.teamEdit = {
		organizationId: org_id,
		teamId: team.id,
		editedByUserId: session?.userId || "",
	};
	return c.json({
		success: true,
		data: team,
	});
});
apiRouteAdminOrganization.delete("/team", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Remove team requested";
	const session = c.get("session");
	const { org_id, team_id } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "teams");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to remove teams",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
	}
	const [removed] = await db
		.delete(schema.team)
		.where(and(eq(schema.team.id, team_id), eq(schema.team.organizationId, org_id)))
		.returning();
	if (!removed) {
		wideEvent.error = {
			type: "DatabaseError",
			code: "TeamRemovalFailed",
			message: "Failed to remove team",
		};
		return c.json({ success: false, error: "Failed to remove team." }, 500);
	}
	wideEvent.teamRemoval = {
		organizationId: org_id,
		teamId: removed.id,
		removedByUserId: session?.userId || "",
	};
	return c.json({
		success: true,
		data: removed,
	});
});

apiRouteAdminOrganization.post("/team-member", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Add member to team requested";
	const session = c.get("session");
	const { org_id, team_id, member_id } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "teams");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to add members to teams",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
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
		wideEvent.error = {
			type: "DatabaseError",
			code: "TeamMemberAdditionFailed",
			message: "Failed to add member to team",
		};
		return c.json({ success: false, error: "Failed to add member to team." }, 500);
	}
	wideEvent.teamMemberAddition = {
		organizationId: org_id,
		teamId: team_id,
		memberId: member_id,
		addedByUserId: session?.userId || "",
	};
	return c.json({
		success: true,
		data: memberTeam,
	});
});
apiRouteAdminOrganization.delete("/team-member", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Remove member from team requested";
	const session = c.get("session");
	const { org_id, team_id, member_id } = await c.req.json();
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "teams");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to remove members from teams",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
	}
	const [removed] = await db
		.delete(schema.memberTeam)
		.where(and(eq(schema.memberTeam.teamId, team_id), eq(schema.memberTeam.memberId, member_id)))
		.returning();
	if (!removed) {
		wideEvent.error = {
			type: "DatabaseError",
			code: "TeamMemberRemovalFailed",
			message: "Failed to remove member from team",
		};
		return c.json({ success: false, error: "Failed to remove member from team." }, 500);
	}
	wideEvent.teamMemberRemoval = {
		organizationId: org_id,
		teamId: team_id,
		memberId: member_id,
		removedByUserId: session?.userId || "",
	};
	return c.json({
		success: true,
		data: removed,
	});
});

// Task routes
apiRouteAdminOrganization.route("/task", apiRouteAdminProjectTask);
