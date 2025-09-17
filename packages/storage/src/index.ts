import crypto from "node:crypto";
import type { Readable } from "node:stream";
import { getUsersByIds } from "@repo/database";
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
		process.env.STORAGE_BUCKET || "",
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
		const stream = minioClient.listObjectsV2(process.env.STORAGE_BUCKET || "", prefix, recursive);

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

/**
 * Lists file objects from the configured MinIO bucket, including enriched metadata.
 *
 * @param prefix - Optional prefix (folder path) to filter objects. Defaults to `""` (all objects).
 * @param recursive - Whether to list objects recursively (include subfolders). Defaults to `true`.
 * @returns A promise that resolves to an array of enriched objects. Each object includes:
 * - `name`: The file name (object key).
 * - `size`, `etag`, `lastModified`: Standard MinIO object attributes.
 * - `metaData`: Object metadata set during upload.
 * - `contentType`: Content type of the object.
 * - `userId`: The uploader's user ID (from metadata).
 * - `user`: An object with the uploader's `name` and `image`, if available.
 *
 * @example
 * ```ts
 * const objects = await listFileObjectsWithMetadata("organization/123/", true);
 *
 * objects.forEach(obj => {
 *   console.log(`${obj.name} (${obj.contentType}) uploaded by ${obj.user?.name}`);
 * });
 * ```
 */
export async function listFileObjectsWithMetadata(prefix = "", recursive = true): Promise<Minio.BucketItem[]> {
	return new Promise((resolve, reject) => {
		const items: Minio.BucketItem[] = [];
		const bucket = process.env.STORAGE_BUCKET || "";
		const stream = minioClient.listObjectsV2(bucket, prefix, recursive);

		stream.on("data", (obj: Minio.BucketItem & { name?: string }) => {
			if (obj.name) {
				items.push({ ...obj, name: obj.name } as Minio.BucketItem);
			}
		});

		stream.on("error", (err) => reject(err));

		stream.on("end", async () => {
			try {
				// Fetch all stats in parallel
				const stats = await Promise.all(
					items.map(async (item) => {
						if (!item.name) return null;
						const stat = await minioClient.statObject(bucket, item.name);
						return { item, stat };
					})
				);

				// Collect ALL userIds present in metadata
				const userIds = [
					...new Set(
						stats
							.map((s) => s?.stat.metaData["user-id"])
							.filter(Boolean) // drop undefined/null
					),
				];

				// Batch load all users at once
				const users = await getUsersByIds(userIds);
				const userMap = new Map(users.map((u) => [u.id, u]));

				// Merge everything back
				const enriched = stats
					.filter((s): s is NonNullable<typeof s> => !!s)
					.map(({ item, stat }) => {
						const userId = stat.metaData["user-id"];
						return {
							...item,
							metaData: stat.metaData,
							contentType: stat.metaData["content-type"],
							lastModified: stat.lastModified,
							user: userId
								? {
										id: userId,
										name: userMap.get(userId)?.name,
										image: userMap.get(userId)?.image,
									}
								: undefined,
						};
					});

				resolve(enriched);
			} catch (err) {
				reject(err);
			}
		});
	});
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

/**
 * Extracts the file name (last path segment) from a given URL or path.
 *
 * @param url - A full URL or path string.
 * @returns The last segment of the path (the file name), or an empty string if none found.
 *
 * @example
 * ```ts
 * const fileName1 = getFileNameFromUrl("https://cdn.example.com/org/123/logo.png");
 * // "logo.png"
 *
 * const fileName2 = getFileNameFromUrl("organization/123/banner.webp");
 * // "banner.webp"
 * ```
 */
export function getFileNameFromUrl(url: string): string {
	return url.split("/").pop() || "";
}

/**
 * Ensures a file path or URL has the correct CDN base URL.
 *
 * - If the string already starts with `cdnBase` or an absolute URL, returns it unchanged.
 * - If it's a relative path, prepends the configured CDN base.
 *
 * @param pathOrUrl - A relative path or full URL to normalize.
 * @param cdnBase - The CDN base URL to prepend (defaults to `process.env.FILE_CDN`).
 * @returns A properly formatted absolute CDN URL pointing to the resource.
 *
 * @example
 * ```ts
 * const url1 = ensureCdnUrl("organization/123/logo.png", "https://files.domain.com");
 * // "https://files.domain.com/organization/123/logo.png"
 *
 * const url2 = ensureCdnUrl("https://files.domain.com/organization/123/logo.png");
 * // "https://files.domain.com/organization/123/logo.png"
 * ```
 */
export function ensureCdnUrl(pathOrUrl: string, cdnBase = process.env.FILE_CDN || ""): string {
	if (!pathOrUrl) return "";

	// If already starts with CDN base or http(s) absolute URL → return as-is
	if (pathOrUrl.startsWith(cdnBase) || pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
		return pathOrUrl;
	}

	// Otherwise prepend CDN base
	return `${cdnBase.replace(/\/+$/, "")}/${pathOrUrl.replace(/^\/+/, "")}`;
}
