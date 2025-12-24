import { createHash, randomBytes } from "node:crypto";
import { db, hasOrgPermission } from "@repo/database";
import { removeObject, uploadObject } from "@repo/storage";
import {
	ensureCdnUrl,
	extractPrivateIdFromUrl,
	getFileNameFromUrl,
} from "@repo/util";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import mime from "mime-types";
export const apiRouteFile = new Hono<AppEnv>();

// Upload a file
apiRouteFile.put("/", async (c) => {
	try {
		const recordWideEvent = c.get("recordWideEvent");
		await recordWideEvent({
			name: "file.upload",
			description: "File upload requested",
			data: {},
		});

		const session = c.get("session");
		const orgId = c.req.header("X-File-Privacy");
		// Parse multipart body
		const body = await c.req.parseBody();
		const file = body.file;
		if (!file || !(file instanceof File)) {
			await recordWideEvent({
				name: "file.upload",
				description: "No file uploaded in the request",
				data: {
					type: "UploadError",
					code: "NoFileUploaded",
					message: "No file uploaded in the request",
				},
			});
			return c.json({ success: false, error: "No file uploaded" }, 400);
		}
		// Convert file to buffer
		const buffer = Buffer.from(await file.arrayBuffer());
		// Derive extension safely
		const mimeType =
			file.type || mime.lookup(file.name || "") || "application/octet-stream";
		const ext = mime.extension(mimeType) || "bin";
		// Generate a secure, random file name (e.g. AES-grade hex string)
		const salt = process.env.FILE_SALT || "";
		const randomName = randomBytes(32).toString("hex"); // 64 chars of entropy
		const fullHash = createHash("sha256")
			.update(session?.userId + randomName + salt)
			.digest("hex");

		const objectName = `${fullHash}.${ext}`;
		if (orgId !== "public" && typeof orgId === "string") {
			const isAuthorized = await hasOrgPermission(
				session?.userId || "",
				orgId,
				"members",
			);
			if (!isAuthorized) {
				await recordWideEvent({
					name: "file.upload",
					description: "User not authorized, file uploaded as public",
					data: {
						organizationId: orgId,
						public: true,
					},
				});
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
				await recordWideEvent({
					name: "file.upload",
					description: "Organization not found; uploaded file as public",
					data: {
						organizationId: orgId,
						public: true,
					},
				});
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
			await recordWideEvent({
				name: "file.upload",
				description: "Authorized upload to organization directory",
				data: {
					organizationId: orgId,
					public: false,
				},
			});
			// Upload to storage
			const uploadedUrl = await uploadObject(
				objectName,
				buffer,
				`files/${organization?.privateId}`,
				{
					"Content-Type": file.type || "application/octet-stream",
				},
			);
			const url = ensureCdnUrl(uploadedUrl);

			return c.json({
				success: true,
				url,
			});
		}

		await recordWideEvent({
			name: "file.upload",
			description: "Public file uploaded (no orgId provided)",
			data: {
				public: true,
			},
		});
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
		const recordWideEvent = c.get("recordWideEvent");
		await recordWideEvent({
			name: "file.upload",
			description: "File upload failed",
			data: { error: message },
		});
		return c.json({ success: false, error: "Upload failed" }, 500);
	}
});

apiRouteFile.delete("/", async (c) => {
	try {
		const recordWideEvent = c.get("recordWideEvent");
		await recordWideEvent({
			name: "file.delete",
			description: "File delete requested",
			data: {},
		});

		const session = c.get("session");
		if (!session?.userId) {
			await recordWideEvent({
				name: "file.delete",
				description: "Unauthorized file delete attempt",
				data: {
					type: "AuthorizationError",
					code: "Unauthorized",
					message: "User not authenticated",
				},
			});
			return c.json(
				{ success: false, error: "You don’t have permission to do that." },
				401,
			);
		}

		const { url } = await c.req.json();
		if (!url || typeof url !== "string") {
			await recordWideEvent({
				name: "file.delete",
				description: "File delete failed - no URL provided",
				data: {
					type: "DeleteError",
					code: "NoFileUrlProvided",
					message: "No file URL provided in the request",
				},
			});
			return c.json({ success: false, error: "No file URL provided" }, 400);
		}

		const { hasPrivateId, privateId } = extractPrivateIdFromUrl(url);
		const storagePath = hasPrivateId
			? `files/${privateId}/${getFileNameFromUrl(url)}`
			: `files/${getFileNameFromUrl(url)}`;
		await removeObject(storagePath);

		await recordWideEvent({
			name: "file.delete",
			description: "File deleted successfully",
			data: { success: true },
		});

		return c.json({
			success: true,
			message: "File deleted successfully",
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Upload failed";
		console.error("Upload failed:", message);
		const recordWideEvent = c.get("recordWideEvent");
		await recordWideEvent({
			name: "file.delete",
			description: "File delete failed",
			data: { error: message },
		});
		return c.json({ success: false, error: "Upload failed" }, 500);
	}
});
