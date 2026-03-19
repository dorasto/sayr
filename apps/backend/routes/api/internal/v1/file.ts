import { createHash, randomBytes } from "node:crypto";
import { db } from "@repo/database";
import { removeObject, uploadObject } from "@repo/storage";
import {
	ensureCdnUrl,
	extractIdsFromUrl,
	getFileNameFromUrl,
} from "@repo/util";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import mime from "mime-types";
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

	const buffer = Buffer.from(await file.arrayBuffer());

	const mimeType =
		file.type ||
		mime.lookup(file.name || "") ||
		"application/octet-stream";

	const ext = mime.extension(mimeType) || "bin";

	const salt = process.env.FILE_SALT || "";
	const randomName = randomBytes(32).toString("hex");

	const fullHash = createHash("sha256")
		.update(session.userId + randomName + salt)
		.digest("hex");

	const objectName = `${fullHash}.${ext}`;
	const contentType = file.type || "application/octet-stream";

	const performUpload = async (path: string, isPrivate: boolean) => {
		const uploadedUrl = await traceAsync(
			"file.upload.storage",
			() =>
				uploadObject(objectName, buffer, path, {
					"Content-Type": contentType,
				}),
			{
				description: `Uploading file to ${isPrivate ? "private" : "public"
					} storage`,
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
	const url = await performUpload(
		`files/${organization.privateId}/${session?.userId}`,
		true
	);

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
		return c.json(
			{ success: false, error: "UNAUTHORIZED" },
			401
		);
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
		return c.json(
			{ success: false, error: "No file URL provided" },
			400
		);
	}

	const { hasPrivateId, privateId, userId } =
		extractIdsFromUrl(url);
	const fileName = getFileNameFromUrl(url);

	const storagePath = hasPrivateId
		? `files/${privateId}/${userId}/${fileName}`
		: `files/${userId}/${fileName}`;

	await traceAsync(
		"file.delete.storage",
		() => removeObject(storagePath),
		{
			description: "Deleting file from storage",
			data: {
				user: { id: session.userId },
				file: { path: storagePath },
			},
			onSuccess: () => ({
				outcome: "File deleted",
			}),
		}
	);

	return c.json({
		success: true,
		message: "File deleted successfully",
	});
});