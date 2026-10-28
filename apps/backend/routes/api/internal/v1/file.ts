import { createHash, randomBytes } from "node:crypto";
import { db } from "@repo/database";
import { removeObject, resolveSafeUploadType, uploadObject } from "@repo/storage";
import { ensureCdnUrl, extractIdsFromUrl, getFileNameFromUrl } from "@repo/util";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { traceOrgPermissionCheck } from "@/util";

export const apiRouteFile = new Hono<AppEnv>();

// -----------------------------------------------------------------------------
// Upload a file
// -----------------------------------------------------------------------------
apiRouteFile.put("/", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const session = c.get("session");
	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const privacyHeader = c.req.header("X-File-Privacy");

	const body = await c.req.parseBody();
	const file = body.file;

	if (!file || !(file instanceof File)) {
		await recordWideError({
			name: "file.upload.validation",
			error: new Error("No file uploaded"),
			code: "NO_FILE_UPLOADED",
			message: "No file uploaded in the request",
			contextData: {
				user: { id: session.userId },
			},
		});
		return c.json({ success: false, error: "No file uploaded" }, 400);
	}

	// Only allowlisted image/video types may be stored on the public files host.
	// The client-declared type only selects an entry; ext + Content-Type come from the allowlist.
	const safeType = resolveSafeUploadType({ type: file.type, name: file.name }, "media");
	if (!safeType) {
		await recordWideError({
			name: "file.upload.validation",
			error: new Error("Unsupported file type"),
			code: "UNSUPPORTED_FILE_TYPE",
			message: "Uploaded file type is not allowed",
			contextData: {
				user: { id: session.userId },
				file: { type: file.type },
			},
		});
		return c.json({ success: false, error: "Unsupported file type" }, 400);
	}

	const buffer = Buffer.from(await file.arrayBuffer());

	const { ext, contentType } = safeType;

	const salt = process.env.FILE_SALT || "";
	const randomName = randomBytes(32).toString("hex");

	const fullHash = createHash("sha256")
		.update(session.userId + randomName + salt)
		.digest("hex");

	const objectName = `${fullHash}.${ext}`;

	const performUpload = async (path: string, isPrivate: boolean) => {
		const uploadedUrl = await traceAsync(
			"file.upload.storage",
			() =>
				uploadObject(objectName, buffer, path, {
					"Content-Type": contentType,
				}),
			{
				description: `Uploading file to ${isPrivate ? "private" : "public"} storage`,
				data: {
					file: { name: objectName },
					storage: { path, private: isPrivate },
				},
				onSuccess: () => ({
					outcome: "File uploaded",
				}),
			}
		);

		return ensureCdnUrl(uploadedUrl);
	};

	// -------------------------------------------------------------------------
	// Public upload
	// -------------------------------------------------------------------------
	if (privacyHeader === "public" || typeof privacyHeader !== "string") {
		const url = await performUpload(`files/${session?.userId}`, false);
		return c.json({ success: true, url });
	}

	const orgId = privacyHeader;

	// -------------------------------------------------------------------------
	// Private upload – permission check
	// -------------------------------------------------------------------------
	const isAuthorized = await traceOrgPermissionCheck(session.userId, orgId, "members");

	if (!isAuthorized) {
		const url = await performUpload(`files/${session?.userId}`, false);
		return c.json({ success: true, url });
	}

	// -------------------------------------------------------------------------
	// Organization lookup
	// -------------------------------------------------------------------------
	const organization = await traceAsync(
		"file.upload.org_lookup",
		() =>
			db.query.organization.findFirst({
				where: (org) => eq(org.id, orgId),
			}),
		{
			description: "Finding organization",
			data: {
				organization: { id: orgId },
			},
		}
	);

	if (!organization) {
		const url = await performUpload(`files/${session?.userId}`, false);
		return c.json({ success: true, url });
	}

	// -------------------------------------------------------------------------
	// Private upload
	// -------------------------------------------------------------------------
	const url = await performUpload(`files/${organization.privateId}/${session?.userId}`, true);

	return c.json({ success: true, url });
});

// -----------------------------------------------------------------------------
// Delete a file
// -----------------------------------------------------------------------------
apiRouteFile.delete("/", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const session = c.get("session");
	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const body = await c.req.json().catch(() => null);
	const { url }: { url?: string } = body ?? {};

	if (!url || typeof url !== "string") {
		await recordWideError({
			name: "file.delete.validation",
			error: new Error("No file URL provided"),
			code: "NO_FILE_URL",
			message: "No file URL provided in the request",
			contextData: {
				user: { id: session.userId },
			},
		});
		return c.json({ success: false, error: "No file URL provided" }, 400);
	}

	const { hasPrivateId, privateId, userId } = extractIdsFromUrl(url);
	const fileName = getFileNameFromUrl(url);

	// Only accept well-formed ids / generated file names so the rebuilt key can't
	// be steered outside the caller's own folder.
	const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;
	const SAFE_FILE_NAME = /^[A-Za-z0-9]+\.[A-Za-z0-9]+$/;
	if (
		!userId ||
		!SAFE_SEGMENT.test(userId) ||
		!SAFE_FILE_NAME.test(fileName) ||
		(hasPrivateId && (!privateId || !SAFE_SEGMENT.test(privateId)))
	) {
		return c.json({ success: false, error: "Invalid file URL" }, 400);
	}

	const isOwnFile = userId === session.userId;

	if (hasPrivateId && privateId) {
		// Org-private file: caller must belong to the org that owns this privateId.
		// Deleting another member's upload additionally requires org admin.
		const organization = await traceAsync(
			"file.delete.org_lookup",
			() =>
				db.query.organization.findFirst({
					where: (org) => eq(org.privateId, privateId),
					columns: { id: true },
				}),
			{
				description: "Finding organization by private id",
				data: { user: { id: session.userId } },
			}
		);

		const isAuthorized =
			!!organization &&
			(await traceOrgPermissionCheck(
				session.userId,
				organization.id,
				isOwnFile ? "members" : "admin.administrator"
			));

		if (!isAuthorized) {
			return c.json({ success: false, error: "Permission denied" }, 403);
		}
	} else if (!isOwnFile) {
		// Public user file: only the uploader may delete it.
		return c.json({ success: false, error: "Permission denied" }, 403);
	}

	const storagePath = hasPrivateId ? `files/${privateId}/${userId}/${fileName}` : `files/${userId}/${fileName}`;

	await traceAsync("file.delete.storage", () => removeObject(storagePath), {
		description: "Deleting file from storage",
		data: {
			user: { id: session.userId },
			file: { path: storagePath },
		},
		onSuccess: () => ({
			outcome: "File deleted",
		}),
	});

	return c.json({
		success: true,
		message: "File deleted successfully",
	});
});
