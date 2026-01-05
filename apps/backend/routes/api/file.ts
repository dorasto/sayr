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
import { createTraceAsync } from "@/tracing/wideEvent";
export const apiRouteFile = new Hono<AppEnv>();

// Upload a file
apiRouteFile.put("/", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const recordWideEvent = c.get("recordWideEvent");

	const session = c.get("session");
	const orgId = c.req.header("X-File-Privacy");

	const body = await c.req.parseBody();
	const file = body.file;

	if (!file || !(file instanceof File)) {
		await recordWideError({
			name: "file.upload.validation",
			error: new Error("No file uploaded"),
			code: "NO_FILE_UPLOADED",
			message: "No file uploaded in the request",
			contextData: { userId: session?.userId },
		});
		return c.json({ success: false, error: "No file uploaded" }, 400);
	}

	const buffer = Buffer.from(await file.arrayBuffer());

	const mimeType =
		file.type || mime.lookup(file.name || "") || "application/octet-stream";
	const ext = mime.extension(mimeType) || "bin";

	const salt = process.env.FILE_SALT || "";
	const randomName = randomBytes(32).toString("hex");
	const fullHash = createHash("sha256")
		.update(session?.userId + randomName + salt)
		.digest("hex");

	const objectName = `${fullHash}.${ext}`;
	const contentType = file.type || "application/octet-stream";

	const performUpload = async (path: string, isPrivate: boolean) => {
		const uploadedUrl = await traceAsync(
			"file.upload.storage",
			() =>
				uploadObject(objectName, buffer, path, { "Content-Type": contentType }),
			{
				description: `Uploading file to ${isPrivate ? "private" : "public"} storage`,
				data: { objectName, path, isPrivate },
				onSuccess: () => ({
					description: "File uploaded successfully",
					data: { objectName },
				}),
			},
		);
		return ensureCdnUrl(uploadedUrl);
	};

	// Public upload (no orgId or orgId === "public")
	if (orgId === "public" || typeof orgId !== "string") {
		await recordWideEvent({
			name: "file.upload.public",
			description: "Public file upload",
			data: { userId: session?.userId },
		});

		const url = await performUpload("files", false);
		return c.json({ success: true, url });
	}

	// Private upload - check authorization
	const isAuthorized = await traceAsync(
		"hasOrgPermission",
		() => hasOrgPermission(session?.userId || "", orgId, "members"),
		{
			description: "Checking permissions",
			data: {},
			onSuccess: (result) => {
				return result
					? {
							description: "Permission granted",
							data: { orgId, userId: session?.userId },
						}
					: {
							description: "User does not have permission to do that",
						};
			},
		},
	);

	if (!isAuthorized) {
		await recordWideEvent({
			name: "file.upload.fallback_public",
			description: "User not authorized, uploading as public",
			data: { orgId, userId: session?.userId },
		});
		const url = await performUpload("files", false);
		return c.json({ success: true, url });
	}

	const organization = await traceAsync(
		"file.upload.org_lookup",
		() =>
			db.query.organization.findFirst({ where: (org) => eq(org.id, orgId) }),
		{ description: "Finding organization", data: { orgId } },
	);

	if (!organization) {
		await recordWideEvent({
			name: "file.upload.org_not_found",
			description: "Organization not found, uploading as public",
			data: { orgId },
		});

		const url = await performUpload("files", false);
		return c.json({ success: true, url });
	}

	await recordWideEvent({
		name: "file.upload.private",
		description: "Authorized upload to organization directory",
		data: { orgId, userId: session?.userId },
	});

	const url = await performUpload(`files/${organization.privateId}`, true);
	return c.json({ success: true, url });
});

apiRouteFile.delete("/", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const recordWideEvent = c.get("recordWideEvent");

	const session = c.get("session");

	if (!session?.userId) {
		return c.json(
			{ success: false, error: "You don't have permission to do that." },
			401,
		);
	}

	const { url } = await c.req.json();

	if (!url || typeof url !== "string") {
		await recordWideError({
			name: "file.delete.validation",
			error: new Error("No file URL provided"),
			code: "NO_FILE_URL",
			message: "No file URL provided in the request",
			contextData: { userId: session.userId },
		});
		return c.json({ success: false, error: "No file URL provided" }, 400);
	}

	const { hasPrivateId, privateId } = extractPrivateIdFromUrl(url);
	const fileName = getFileNameFromUrl(url);
	const storagePath = hasPrivateId
		? `files/${privateId}/${fileName}`
		: `files/${fileName}`;

	await traceAsync("file.delete.storage", () => removeObject(storagePath), {
		description: "Deleting file from storage",
		data: { storagePath, userId: session.userId },
		onSuccess: () => ({
			description: "File deleted successfully",
			data: { storagePath },
		}),
	});

	await recordWideEvent({
		name: "file.delete.success",
		description: "File deleted successfully",
		data: { storagePath, userId: session.userId },
	});

	return c.json({
		success: true,
		message: "File deleted successfully",
	});
});
