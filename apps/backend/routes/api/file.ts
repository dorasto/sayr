import { createHash, randomBytes } from "node:crypto";
import { db } from "@repo/database";
import { removeObject, uploadObject } from "@repo/storage";
import { ensureCdnUrl, getFileNameFromUrl } from "@repo/util";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { checkMembershipRole } from "@/util";

export const apiRouteFile = new Hono<AppEnv>();

// Upload a file
apiRouteFile.put("/", async (c) => {
	try {
		const session = c.get("session");
		const orgId = c.req.header("X-File-Privacy");
		// Parse multipart body
		const body = await c.req.parseBody();
		const file = body.file;
		if (!file || !(file instanceof File)) {
			return c.json({ success: false, error: "No file uploaded" }, 400);
		}
		// Convert file to buffer
		const buffer = Buffer.from(await file.arrayBuffer());
		// Derive extension safely
		const ext = file.name.split(".").pop() || file.type.split("/")[1] || "bin";
		// Generate a secure, random file name (e.g. AES-grade hex string)
		// Salt to make hashes unpredictable even if filename known
		const salt = process.env.FILE_SALT || "";
		// Generate salted SHA-256 hash
		const randomName = randomBytes(32).toString("hex"); // 64 chars of entropy
		const fullHash = createHash("sha256")
			.update(session?.userId + randomName + salt)
			.digest("hex");

		const objectName = `${fullHash}.${ext}`;
		if (orgId !== "public" && typeof orgId === "string") {
			const isAuthorized = await checkMembershipRole(session?.userId, orgId);
			if (!isAuthorized) {
				// Upload to storage
				const uploadedUrl = await uploadObject(objectName, buffer, `files`, {
					"Content-Type": file.type || "application/octet-stream",
				});
				const url = ensureCdnUrl(uploadedUrl);

				return c.json({
					success: true,
					url,
				});
			}
			const organization = await db.query.organization.findFirst({
				where: (org) => eq(org.id, orgId),
			});
			if (!organization) {
				// Upload to storage
				const uploadedUrl = await uploadObject(objectName, buffer, `files`, {
					"Content-Type": file.type || "application/octet-stream",
				});
				const url = ensureCdnUrl(uploadedUrl);

				return c.json({
					success: true,
					url,
				});
			}
			// Upload to storage
			const uploadedUrl = await uploadObject(objectName, buffer, `files/${organization?.privateId}`, {
				"Content-Type": file.type || "application/octet-stream",
			});
			const url = ensureCdnUrl(uploadedUrl);

			return c.json({
				success: true,
				url,
			});
		}
		// Upload to storage
		const uploadedUrl = await uploadObject(objectName, buffer, `files`, {
			"Content-Type": file.type || "application/octet-stream",
		});
		const url = ensureCdnUrl(uploadedUrl);

		return c.json({
			success: true,
			url,
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Upload failed";
		console.error("Upload failed:", message);
		return c.json({ success: false, error: "Upload failed" }, 500);
	}
});

apiRouteFile.delete("/", async (c) => {
	try {
		const session = c.get("session");
		if (!session?.userId) {
			return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
		}
		const { url } = await c.req.json();
		if (!url || typeof url !== "string") {
			return c.json({ success: false, error: "No file URL provided" }, 400);
		}
		await removeObject(`files/${getFileNameFromUrl(url)}`);
		return c.json({
			success: true,
			message: "File deleted successfully",
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Upload failed";
		console.error("Upload failed:", message);
		return c.json({ success: false, error: "Upload failed" }, 500);
	}
});
