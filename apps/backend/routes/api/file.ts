import { createHash, randomBytes } from "node:crypto";
import { db, hasOrgPermission } from "@repo/database";
import { removeObject, uploadObject } from "@repo/storage";
import { ensureCdnUrl, extractPrivateIdFromUrl, getFileNameFromUrl } from "@repo/util";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import mime from "mime-types";
export const apiRouteFile = new Hono<AppEnv>();

// Upload a file
apiRouteFile.put("/", async (c) => {
	try {
		const wideEvent = c.get("wideEvent");
		wideEvent.description = "File upload requested";
		const session = c.get("session");
		const orgId = c.req.header("X-File-Privacy");
		// Parse multipart body
		const body = await c.req.parseBody();
		const file = body.file;
		if (!file || !(file instanceof File)) {
			wideEvent.error = {
				type: "UploadError",
				code: "NoFileUploaded",
				message: "No file uploaded in the request",
			};
			return c.json({ success: false, error: "No file uploaded" }, 400);
		}
		// Convert file to buffer
		const buffer = Buffer.from(await file.arrayBuffer());
		// Derive extension safely
		const mimeType = file.type || mime.lookup(file.name || "") || "application/octet-stream";
		const ext = mime.extension(mimeType) || "bin";
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
			const isAuthorized = await hasOrgPermission(session?.userId || "", orgId, "members");
			if (!isAuthorized) {
				wideEvent.upload = {
					organizationId: orgId,
					public: true,
				};
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
				wideEvent.upload = {
					organizationId: orgId,
					public: true,
				};
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
			wideEvent.upload = {
				organizationId: orgId,
				public: false,
			};
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
		wideEvent.upload = {
			public: true,
		};
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
		const wideEvent = c.get("wideEvent");
		wideEvent.description = "File delete requested";
		const session = c.get("session");
		if (!session?.userId) {
			wideEvent.error = {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User not authenticated",
			};
			return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
		}
		const { url } = await c.req.json();
		if (!url || typeof url !== "string") {
			wideEvent.error = {
				type: "DeleteError",
				code: "NoFileUrlProvided",
				message: "No file URL provided in the request",
			};
			return c.json({ success: false, error: "No file URL provided" }, 400);
		}
		const { hasPrivateId, privateId } = extractPrivateIdFromUrl(url);
		const storagePath = hasPrivateId
			? `files/${privateId}/${getFileNameFromUrl(url)}`
			: `files/${getFileNameFromUrl(url)}`;
		await removeObject(storagePath);
		wideEvent.delete = {
			success: true,
		};
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
