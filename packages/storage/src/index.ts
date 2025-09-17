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

export async function listFileObjectsWithMetadata(
	prefix = "",
	recursive = true
): Promise<(Minio.BucketItem & { metaData?: Record<string, string> })[]> {
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
				const enriched = await Promise.all(
					items.map(async (item) => {
						if (item.name) {
							const stat = await minioClient.statObject(bucket, item.name);
							return {
								...item,
								metaData: stat.metaData,
								contentType: stat.metaData["content-type"],
								lastModified: stat.lastModified,
							};
						}
						return item;
					})
				);
				resolve(enriched);
			} catch (err) {
				reject(err);
			}
		});
	});
}

/**
 * Remove a single object from the bucket.
 *
 * @param objectName Key to delete
 */
export async function removeObject(objectName: string): Promise<void> {
	await minioClient.removeObject(BUCKET, objectName);
}

/**
 * Remove multiple objects from the bucket in one call
 */
export async function removeObjects(objectNames: string[]): Promise<void> {
	await minioClient.removeObjects(BUCKET, objectNames);
}

export function getFileNameFromUrl(url: string): string {
	return url.split("/").pop() || "";
}

export function ensureCdnUrl(pathOrUrl: string, cdnBase = process.env.FILE_CDN || ""): string {
	if (!pathOrUrl) return "";

	// If it already starts with http(s)://cdnBase → return as-is
	if (pathOrUrl.startsWith(cdnBase) || pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
		return pathOrUrl;
	}

	// Otherwise prepend CDN base
	// Avoid double slashes
	return `${cdnBase.replace(/\/+$/, "")}/${pathOrUrl.replace(/^\/+/, "")}`;
}
