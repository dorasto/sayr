import { randomBytes } from "node:crypto";
import { db, getLabels, getOrganizationMembers, schema } from "@repo/database";
import { removeObject, uploadObject } from "@repo/storage";
import { ensureCdnUrl, getFileNameFromUrl } from "@repo/util";
import { and, eq, lt, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { checkMembershipRole, decodeCursor, encodeCursor } from "@/util";
import { broadcast, broadcastByUserId, broadcastPublic, findClientByWsId } from "../ws";
import type { WSBaseMessage } from "../ws/types";
import { apiRouteAdminProjectTask } from "./task";
export const apiRouteAdminOrganization = new Hono<AppEnv>();

// Update organization details
apiRouteAdminOrganization.post("/update", async (c) => {
	const { org_id, wsClientId, data } = await c.req.json();
	const session = c.get("session");
	const isAuthorized = await checkMembershipRole(session?.userId, org_id);
	if (!isAuthorized) {
		return c.json({ error: "UNAUTHORIZED" }, 401);
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
		broadcastPublic(org_id, { ...data, data: { ...data.data, privateId: null } });
		const members = await getOrganizationMembers(org_id);
		members.forEach((member) => {
			broadcastByUserId(member.userId, wsClientId, org_id, data, "");
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
		const session = c.get("session");
		const user = c.get("user");
		const orgId = c.req.param("orgId");
		const oldLogo = c.req.header("X-old-file");

		const isAuthorized = await checkMembershipRole(session?.userId, orgId);
		if (!isAuthorized) {
			return c.json({ error: "UNAUTHORIZED" }, 401);
		}

		// 2. Parse multipart body
		const body = await c.req.parseBody();
		const file = body.file;
		if (!file || !(file instanceof File)) {
			return c.text("No file uploaded", 400);
		}

		const buffer = Buffer.from(await file.arrayBuffer());

		// Preserve the original extension based on file name or MIME
		const ext = file.name.split(".").pop() || file.type.split("/")[1] || "png";
		const objectName = `/logo.${ext}`;
		if (oldLogo) {
			await removeObject(`organization/${orgId}/${getFileNameFromUrl(oldLogo)}`);
			await db
				.delete(schema.file)
				.where(
					and(
						eq(schema.file.organizationId, orgId),
						eq(schema.file.url, `organization/${orgId}/${getFileNameFromUrl(oldLogo)}`)
					)
				);
		}
		// 3. Upload to storage
		const imagelogo = await uploadObject(objectName, buffer, `organization/${orgId}`, {
			"Content-Type": file.type || "application/octet-stream",
			originalName: objectName,
		});
		await db.insert(schema.file).values({
			organizationId: orgId,
			fileName: objectName,
			url: imagelogo,
			userId: user?.id || "ANONYMOUS",
			visibility: "public",
			type: file.type || "application/octet-stream",
		});

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
		const session = c.get("session");
		const user = c.get("user");
		const orgId = c.req.param("orgId");
		const oldBanner = c.req.header("X-old-file");

		const isAuthorized = await checkMembershipRole(session?.userId, orgId);
		if (!isAuthorized) {
			return c.json({ error: "UNAUTHORIZED" }, 401);
		}

		// 2. Parse multipart body
		const body = await c.req.parseBody();
		const file = body.file;
		if (!file || !(file instanceof File)) {
			return c.text("No file uploaded", 400);
		}

		const buffer = Buffer.from(await file.arrayBuffer());

		// Preserve the original extension based on file name or MIME
		const ext = file.name.split(".").pop() || file.type.split("/")[1] || "png";
		const objectName = `banner.${ext}`;
		if (oldBanner) {
			await removeObject(`organization/${orgId}/${getFileNameFromUrl(oldBanner)}`);
			await db
				.delete(schema.file)
				.where(
					and(
						eq(schema.file.organizationId, orgId),
						eq(schema.file.url, `organization/${orgId}/${getFileNameFromUrl(oldBanner)}`)
					)
				);
		}
		// 3. Upload to storage
		const imagebanner = await uploadObject(objectName, buffer, `organization/${orgId}`, {
			"Content-Type": file.type || "application/octet-stream",
			originalName: objectName,
		});
		await db.insert(schema.file).values({
			organizationId: orgId,
			fileName: objectName,
			url: imagebanner,
			userId: user?.id || "ANONYMOUS",
			visibility: "public",
			type: file.type || "application/octet-stream",
		});

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

// list organization assets as a paginated response
apiRouteAdminOrganization.get("/:orgId/files", async (c) => {
	const session = c.get("session");
	const orgId = c.req.param("orgId");

	// Authorization
	const isAuthorized = await checkMembershipRole(session?.userId, orgId);
	if (!isAuthorized) {
		return c.json({ error: "UNAUTHORIZED" }, 401);
	}

	// --- Pagination params ---
	const pageSize = Math.min(Number(c.req.query("limit") ?? 10), 200);
	const encodedCursor = c.req.query("cursor");
	const decodedCursor = decodeCursor<{ id?: string; index?: number }>(encodedCursor);

	const cursorId = decodedCursor?.id;
	const cursorIndex = decodedCursor?.index ?? 0;

	// --- Total count query ---
	const [count] = await db
		.select({ count: sql<number>`count(*)` })
		.from(schema.file)
		.where(eq(schema.file.organizationId, orgId));

	// --- Where clause ---
	// IDs descend. Show items "older than" the cursor for next pages.
	const whereClause = cursorId
		? and(eq(schema.file.organizationId, orgId), lt(schema.file.id, cursorId))
		: eq(schema.file.organizationId, orgId);

	// --- Fetch one extra to check for next page ---
	const assets = await db.query.file.findMany({
		where: whereClause,
		with: {
			user: { columns: { id: true, name: true, image: true } },
		},
		orderBy: (a, { desc }) => desc(a.id),
		limit: pageSize + 1,
	});

	// --- Handle pagination / cursors ---
	const hasMore = assets.length > pageSize;
	const visibleAssets = hasMore ? assets.slice(0, pageSize) : assets;

	const nextCursor =
		hasMore && visibleAssets.length > 0
			? encodeCursor({
					id: visibleAssets[visibleAssets.length - 1]?.id,
					index: cursorIndex + 1, // page index increment
				})
			: undefined;

	// --- Transform / enrich ---
	const data = visibleAssets.map((asset) => ({
		...asset,
		url: ensureCdnUrl(asset.url),
	}));

	// --- Compute "page" stats ---
	const currentPage = cursorIndex + 1;
	const totalPages = count?.count && count.count > 0 ? Math.ceil(count.count / pageSize) : currentPage;

	return c.json({
		data,
		pagination: {
			pageSize,
			currentPage,
			totalItems: Number(count?.count || 0),
			totalPages,
			hasMore,
			nextCursor,
		},
	});
});

// Label management
// Create label with name and color
apiRouteAdminOrganization.post("/create-label", async (c) => {
	const session = c.get("session");
	const { org_id, wsClientId, name, color } = await c.req.json();
	const isAuthorized = await checkMembershipRole(session?.userId, org_id);
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
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
	return c.json({
		success: true,
		data: labels,
	});
});
// Edit label name and color
apiRouteAdminOrganization.patch("/edit-label", async (c) => {
	const session = c.get("session");
	const { org_id, wsClientId, id, name, color } = await c.req.json();
	const isAuthorized = await checkMembershipRole(session?.userId, org_id);
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
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
	return c.json({
		success: true,
		data: labels,
	});
});
// Delete label by label ID
apiRouteAdminOrganization.delete("/delete-label", async (c) => {
	const session = c.get("session");
	const { org_id, wsClientId, id } = await c.req.json();
	const isAuthorized = await checkMembershipRole(session?.userId, org_id);
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	const [removed] = await db
		.delete(schema.label)
		.where(and(eq(schema.label.id, id), eq(schema.label.organizationId, org_id), eq(schema.label.id, id)))
		.returning();
	if (!removed) {
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
	return c.json({
		success: true,
		data: labels,
	});
});

// Category management
// Create category with name, color, and icon
apiRouteAdminOrganization.post("/create-category", async (c) => {
	const session = c.get("session");
	const { org_id, wsClientId, name, color, icon } = await c.req.json();
	const isAuthorized = await checkMembershipRole(session?.userId, org_id);
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
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
	return c.json({
		success: true,
		data: categories,
	});
});
// Edit category name, color, and icon
apiRouteAdminOrganization.patch("/edit-category", async (c) => {
	const session = c.get("session");
	const { org_id, wsClientId, id, name, color, icon } = await c.req.json();
	const isAuthorized = await checkMembershipRole(session?.userId, org_id);
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
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
	return c.json({
		success: true,
		data: categories,
	});
});
// Delete category by category ID
apiRouteAdminOrganization.delete("/delete-category", async (c) => {
	const session = c.get("session");
	const { org_id, wsClientId, id } = await c.req.json();
	const isAuthorized = await checkMembershipRole(session?.userId, org_id);
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	const [removed] = await db
		.delete(schema.category)
		.where(and(eq(schema.category.id, id), eq(schema.category.organizationId, org_id), eq(schema.category.id, id)))
		.returning();
	if (!removed) {
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
	return c.json({
		success: true,
		data: categories,
	});
});

// Saved View management
// Create saved view with name and filter params
apiRouteAdminOrganization.post("/create-view", async (c) => {
	const session = c.get("session");
	const { org_id, wsClientId, name, value } = await c.req.json();
	const isAuthorized = await checkMembershipRole(session?.userId, org_id);
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	const [view] = await db
		.insert(schema.savedView)
		.values({
			organizationId: org_id,
			createdById: session?.userId,
			name,
			filterParams: value,
		})
		.returning();
	if (!view) {
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
	return c.json({
		success: true,
		data: views,
	});
});
apiRouteAdminOrganization.post("/connections/github/sync-repo", async (c) => {
	const session = c.get("session");
	const { org_id, repo_id, repo_name, installation_id, category_id } = await c.req.json();
	const isAuthorized = await checkMembershipRole(session?.userId, org_id);
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
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
	return c.json({
		success: true,
		data: result,
	});
});

//team member routes

apiRouteAdminOrganization.post("/member", async (c) => {
	const session = c.get("session");
	const { org_id, emails }: { org_id: string; emails: string[] } = await c.req.json();

	// --- Permissions ---
	const isAuthorized = await checkMembershipRole(session?.userId, org_id, ["owner"]);
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const invites = [];
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

	return c.json({
		success: true,
		invites,
		...(failedEmails.length > 0 && { errors: failedEmails }),
	});
});

apiRouteAdminOrganization.delete("/member", async (c) => {
	const session = c.get("session");
	const { org_id, user_id } = await c.req.json();
	const isAuthorized = await checkMembershipRole(session?.userId, org_id, ["owner"]);
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	const [removed] = await db
		.delete(schema.member)
		.where(and(eq(schema.member.organizationId, org_id), eq(schema.member.userId, user_id)))
		.returning();
	if (!removed) {
		return c.json({ success: false, error: "Failed to remove member." }, 500);
	}
	broadcastByUserId(user_id, "", org_id, {
		type: "MEMBER_ACTIONS",
		data: { orgId: org_id, userId: user_id, action: "REMOVED" },
	});
	return c.json({
		success: true,
		// data: removed,
	});
});

// Task routes
apiRouteAdminOrganization.route("/task", apiRouteAdminProjectTask);
