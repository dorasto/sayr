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
type BucketType = Minio.BucketItem & {
	url: string;
	originalName: string;
	userId: string;
	user?: {
		name: string;
		image: string;
	};
};
export async function listFileObjectsWithMetadata(prefix = "", recursive = true): Promise<BucketType[]> {
	const items: BucketType[] = [];
	const stream = minioClient.listObjectsV2(BUCKET, prefix, recursive);

	// Collect stream results using async iterator
	for await (const obj of stream) {
		if (obj.name) items.push(obj as BucketType);
	}

	// Fire off metadata lookups in parallel
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
					// Optionally log and skip items that fail
					console.warn(`Failed to stat object: ${item.name}`, err);
					return null;
				}
			})
		)
	).filter(Boolean) as BucketType[];

	return enriched;
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
