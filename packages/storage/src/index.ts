import crypto from "node:crypto";
import type { Readable } from "node:stream";
import * as Minio from "minio";

const minioClient = new Minio.Client({
	endPoint: process.env.STORAGE_URL || "",
	port: Number(process.env.STORAGE_PORT) || 443,
	accessKey: process.env.STORAGE_ACCESS_KEY || "",
	secretKey: process.env.STORAGE_SECRET_KEY || "",
});

const BUCKET = process.env.STORAGE_BUCKET || "";

/**
 * Upload an object to MinIO/Hetzner with an obfuscated filename.
 *
 * @param objectName - The original file name (used only to derive extension & metadata).
 * @param data - File contents (Buffer|string|Readable stream).
 * @param path - Optional "folder" prefix inside the bucket (e.g. "user_123/uploads").
 * @param meta - Optional metadata headers.
 * @returns The final object key (path + obfuscated file name).
 *
 * @example
 * ```ts
 * const key = await uploadObject("report.pdf", fileBuffer, "user_123", {});
 * // → user_123/d2b627f70f891437.pdf
 * ```
 */
export async function uploadObject(
	objectName: string,
	data: string | Buffer | Readable,
	path?: string,
	meta?: Record<string, string>
) {
	const extension = objectName.split(".").pop();

	// Salt to make hashes unpredictable even if filename known
	const salt = process.env.FILE_SALT || "";

	// Length of the final hash string — e.g. 16 / 24 / 32
	const hashLength = parseInt(process.env.FILE_NAME_HASH_LENGTH || "32", 10);

	// Generate salted SHA-256 hash
	const fullHash = crypto
		.createHash("sha256")
		.update(objectName + Date.now().toString() + salt)
		.digest("hex");

	// Truncate hash to desired length
	const shortHash = fullHash.slice(0, hashLength);

	// Build final obfuscated filename
	const obfuscatedName = extension ? `${shortHash}.${extension}` : shortHash;

	// Prefix with optional path (like folders in S3/MinIO)
	const finalKey = path ? `${path.replace(/\/+$/, "")}/${obfuscatedName}` : obfuscatedName;

	// Auto-size for strings/buffers
	const size = typeof data === "string" || Buffer.isBuffer(data) ? Buffer.byteLength(data) : undefined;

	await minioClient.putObject(
		BUCKET,
		finalKey,
		data,
		size,
		{ ...meta, originalName: objectName } // 👈 Keep original name in metadata
	);

	return finalKey;
}

/**
 * List objects inside a bucket (with optional prefix).
 *
 * @param prefix filter by prefix folder ("" for all)
 * @param recursive true to include nested prefixes
 */
export function listFileObjects(prefix = "", recursive = true): Promise<Minio.BucketItem[]> {
	return new Promise((resolve, reject) => {
		const items: Minio.BucketItem[] = [];
		const stream = minioClient.listObjectsV2(BUCKET, prefix, recursive);

		stream.on("data", (obj: Minio.BucketItem & { name?: string }) => {
			if (obj.name) {
				items.push({
					...obj,
					name: obj.name, // TS assertion: now guaranteed
				} as Minio.BucketItem);
			}
		});
		stream.on("error", (err) => reject(err));
		stream.on("end", () => resolve(items));
	});
}
type BucketType = Minio.BucketItem & {
	url: string;
	originalName: string;
	userId: string;
	user?: {
		name: string;
		image: string;
	};
};
type ListResult = {
	objects: BucketType[];
	nextStartAfter?: string;
	hasMore?: boolean;
};
/**
 * Lists file objects from the configured MinIO bucket, including enriched metadata.
 *
 * Supports simple pagination using the `startAfter` parameter and a configurable `pageSize`.
 *
 * @param prefix - Optional object key prefix (e.g., folder path) used to filter results.
 * Defaults to an empty string (`""`), which lists all objects.
 *
 * @param pageSize - The maximum number of items to return per call. Defaults to `20`.
 *
 * @param startAfter - The name (object key) of the last item from the previous page.
 * When provided, the listing will start *after* this key.
 *
 * @returns A promise resolving to an object containing:
 * - `objects`: An array of enriched bucket items. Each item includes:
 *   - `name`: The object key (file name).
 *   - `size`, `etag`, `lastModified`: Standard MinIO object attributes.
 *   - `metaData`: Metadata that was set during upload.
 *   - `contentType`: The MIME type of the file.
 *   - `userId`: The uploader’s user ID (from metadata, if available).
 *   - `user`: An optional object containing the uploader’s `name` and `image`, if available.
 * - `nextStartAfter`: The key of the last object in the current page, to use as the
 *   `startAfter` value for the next page (undefined if there are no more results).
 *
 * @example
 * ```ts
 * // Get first page (20 objects)
 * const { objects, nextStartAfter } = await listFileObjectsWithMetadata("organization/123/", true, 20);
 *
 * console.log("Page 1:", objects.length, "files");
 *
 * // Fetch next page
 * if (nextStartAfter) {
 *   const nextPage = await listFileObjectsWithMetadata("organization/123/", true, 20, nextStartAfter);
 *   console.log("Page 2:", nextPage.objects.length, "files");
 * }
 * ```
 */
export async function listFileObjectsWithMetadata(
	prefix = "",
	pageSize = 50,
	startAfter?: string
): Promise<ListResult> {
	const items: BucketType[] = [];
	const stream = minioClient.listObjectsV2(BUCKET, prefix, false, startAfter);

	let seenCount = 0;

	for await (const obj of stream) {
		if (!obj.name) continue;

		items.push(obj as BucketType);
		seenCount++;

		if (seenCount >= pageSize) break; // stop early after reaching page limit
	}

	// The next cursor is the name of the LAST returned item
	const nextStartAfter = items.length > 0 ? items[items.length - 1]?.name : undefined;

	// Determine if there might be more (true if stream didn’t end yet)
	// Try to peek one item beyond by checking if stream ended early
	let hasMore = false;

	// Only run the stream check if we stopped due to reaching pageSize
	if (seenCount >= pageSize) {
		const nextStream = minioClient.listObjectsV2(BUCKET, prefix, false, nextStartAfter);
		// Peek one next item without consuming much
		for await (const _ of nextStream) {
			hasMore = true;
			break;
		}
	}

	// Fetch metadata concurrently for current page
	const enriched = (
		await Promise.all(
			items.map(async (item) => {
				if (!item.name) return null;
				try {
					const stat = await minioClient.statObject(BUCKET, item.name);
					return {
						...item,
						lastModified: stat.lastModified,
						originalName: stat.metaData?.originalname,
						userId: stat.metaData?.["user-id"],
						contentType: stat.metaData?.["content-type"],
					} as BucketType;
				} catch (err) {
					console.warn(`Failed to stat object: ${item.name}`, err);
					return null;
				}
			})
		)
	).filter(Boolean) as BucketType[];

	return {
		objects: enriched,
		nextStartAfter,
		hasMore,
	};
}
/**
 * Removes a single object from the configured MinIO bucket.
 *
 * @param objectName - The key (path/name) of the object to delete.
 * @returns A promise that resolves when the object has been successfully removed.
 *
 * @example
 * ```ts
 * await removeObject("organization/123/logo.png");
 * console.log("Logo removed.");
 * ```
 */
export async function removeObject(objectName: string): Promise<void> {
	await minioClient.removeObject(BUCKET, objectName);
}

/**
 * Removes multiple objects from the configured MinIO bucket in one call.
 *
 * @param objectNames - An array of object keys to delete.
 * @returns A promise that resolves when the objects have been successfully removed.
 *
 * @example
 * ```ts
 * await removeObjects([
 *   "organization/123/logo.png",
 *   "organization/123/banner.png"
 * ]);
 * console.log("Multiple files removed.");
 * ```
 */
export async function removeObjects(objectNames: string[]): Promise<void> {
	await minioClient.removeObjects(BUCKET, objectNames);
}
