import { db, getOrCreateLabel, getOrganizationMembers, getUsersByIds, schema } from "@repo/database";
import { listFileObjectsWithMetadata, removeObject, uploadObject } from "@repo/storage";
import { ensureCdnUrl, getFileNameFromUrl } from "@repo/util";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { checkMembershipRole } from "@/util";
import { broadcast, broadcastIndividual, broadcastPublic, findClientByWsId, findClientsByUserId } from "../ws";
import type { WSBaseMessage } from "../ws/types";
import { apiRouteAdminProject } from "./project";
export const apiRouteAdminOrganization = new Hono<AppEnv>();
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
			const clients = findClientsByUserId(member.userId);
			clients.forEach((c) => broadcastIndividual(c.socket, data));
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
		}
		// 3. Upload to storage
		const imagelogo = await uploadObject(objectName, buffer, `organization/${orgId}`, {
			"Content-Type": file.type || "application/octet-stream",
			"user-id": user?.id || "ANONYMOUS",
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
		}
		// 3. Upload to storage
		const imagebanner = await uploadObject(objectName, buffer, `organization/${orgId}`, {
			"Content-Type": file.type || "application/octet-stream",
			"user-id": user?.id || "ANONYMOUS",
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

apiRouteAdminOrganization.get("/:orgId/assets", async (c) => {
	const session = c.get("session");
	const orgId = c.req.param("orgId");
	const isAuthorized = await checkMembershipRole(session?.userId, orgId);
	if (!isAuthorized) {
		return c.json({ error: "UNAUTHORIZED" }, 401);
	}
	const data = await listFileObjectsWithMetadata(`organization/${orgId}`);
	// Collect ALL userIds present in metadata
	const userIds = [
		...new Set(
			data
				.map((s) => s.userId)
				.filter(Boolean) // drop undefined/null
		),
	];

	// Batch load all users at once
	const users = await getUsersByIds(userIds);
	const userMap = new Map(users.map((u) => [u.id, u]));
	data.map((item) => {
		item.url = ensureCdnUrl(item.name || "");
		item.user = {
			name: userMap.get(item.userId)?.name || "",
			image: userMap.get(item.userId)?.image || "",
		};
	});
	return c.json(data);
});

apiRouteAdminOrganization.post("/create-label", async (c) => {
	const session = c.get("session");
	const { org_id, wsClientId, name, color } = await c.req.json();
	const isAuthorized = await checkMembershipRole(session?.userId, org_id);
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	const label = await getOrCreateLabel(org_id, name, color);
	const found = findClientByWsId(wsClientId);
	const data = {
		type: "CREATE_LABEL" as WSBaseMessage["type"],
		data: label,
	};
	broadcast(org_id, "admin", data, found?.socket);
	broadcastPublic(org_id, { ...data, data: data });
	const members = await getOrganizationMembers(org_id);
	members.forEach((member) => {
		const clients = findClientsByUserId(member.userId);
		clients.forEach((c) => c.wsClientId !== wsClientId && broadcastIndividual(c.socket, data));
	});
	return c.json({
		success: true,
		data: label,
	});
});
apiRouteAdminOrganization.route("/project", apiRouteAdminProject);
