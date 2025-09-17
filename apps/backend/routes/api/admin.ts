import type { auth } from "@repo/auth";
import { db, getOrganizationMembers, schema } from "@repo/database";
import { ensureCdnUrl, getFileNameFromUrl, removeObject, uploadObject } from "@repo/storage";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { broadcast, broadcastIndividual, broadcastPublic, findClientByWsId, findClientsByUserId } from "../ws";

export const apiRouteAdmin = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
}>();
apiRouteAdmin.post("/update-org", async (c) => {
	try {
		const { org_id, wsClientId, data } = await c.req.json();
		const session = c.get("session");
		const start = Date.now();
		const role = await db
			.select()
			.from(schema.member)
			.where(and(eq(schema.member.userId, session?.userId || ""), eq(schema.member.organizationId, org_id)));
		console.log("🚀 ~ roles:", role[0]?.role);
		console.log("hasPermission fetch took", Date.now() - start, "ms");
		if (role[0]?.role === "owner") {
			const startNew = Date.now();
			const [result] = await db
				.update(schema.organization)
				.set({ ...data, updatedAt: new Date() })
				.where(eq(schema.organization.id, org_id))
				.returning();
			console.log("updateOrganization fetch took", Date.now() - startNew, "ms");

			if (result) {
				const found = findClientByWsId(wsClientId);
				const data = {
					type: "UPDATE_ORG",
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
		}
		return c.json({ error: "UNAUTHORIZED" }, 401);
		// biome-ignore lint/suspicious/noExplicitAny: <has to be any>
	} catch (error: any) {
		console.log("🚀 ~ error:", error);
		return c.json(
			{
				path: c.req.path,
				error: error.toString(),
			},
			error.statusCode
		);
	}
});

apiRouteAdmin.put("/orgs/:orgId/logo", async (c) => {
	try {
		const session = c.get("session");
		const user = c.get("user");
		const orgId = c.req.param("orgId");
		const oldLogo = c.req.header("X-old-file");
		// 1. Verify membership + role
		const role = await db
			.select()
			.from(schema.member)
			.where(and(eq(schema.member.userId, session?.userId || ""), eq(schema.member.organizationId, orgId)));

		if (role[0]?.role !== "owner" && role[0]?.role !== "admin") {
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
			"org-id": orgId,
			"original-name": file.name, // store as metadata
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

apiRouteAdmin.put("/orgs/:orgId/banner", async (c) => {
	try {
		const session = c.get("session");
		const user = c.get("user");
		const orgId = c.req.param("orgId");
		const oldBanner = c.req.header("X-old-file");

		// 1. Verify membership + role
		const role = await db
			.select()
			.from(schema.member)
			.where(and(eq(schema.member.userId, session?.userId || ""), eq(schema.member.organizationId, orgId)));

		if (role[0]?.role !== "owner" && role[0]?.role !== "admin") {
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
			"org-id": orgId,
			"original-name": file.name, // store as metadata
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
