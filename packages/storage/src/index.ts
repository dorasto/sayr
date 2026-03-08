import crypto from "node:crypto";
import type { Readable } from "node:stream";
import {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
	DeleteObjectsCommand,
	type DeleteObjectsCommandOutput,
} from "@aws-sdk/client-s3";
import { lookup as mimeLookup } from "mime-types";

function normalizeEndpoint(raw?: string): string | undefined {
	const url = (raw || "").trim();

	if (!url) {
		// Default to local Garage if nothing provided
		return "http://localhost:3900";
	}

	if (url.startsWith("http://") || url.startsWith("https://")) {
		return url;
	}

	// No scheme provided:
	// - localhost / 127.0.0.1 → assume http (typically dev Garage)
	// - everything else → assume https (Hetzner / remote Garage / etc.)
	if (url.startsWith("localhost") || url.startsWith("127.0.0.1")) {
		return `http://${url}`;
	}

	return `https://${url}`;
}

const s3Client = new S3Client({
	region: process.env.STORAGE_REGION || "garage", // any non-empty string
	endpoint: normalizeEndpoint(process.env.STORAGE_URL),
	forcePathStyle: true, // important for Garage
	credentials: {
		accessKeyId: process.env.STORAGE_ACCESS_KEY || "",
		secretAccessKey: process.env.STORAGE_SECRET_KEY || "",
	},
});

const BUCKET = process.env.STORAGE_BUCKET || "";

/**
 * Upload an object to an S3-compatible storage (Garage) with an obfuscated filename.
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
): Promise<string> {
	const extension = objectName.split(".").pop();

	// Salt to make hashes unpredictable even if filename known
	const salt = process.env.FILE_SALT || "";

	// Length of the final hash string — e.g. 16 / 24 / 32 / 64
	const hashLength = parseInt(
		process.env.FILE_NAME_HASH_LENGTH || "64",
		10
	);

	// Generate salted SHA-256 hash
	const fullHash = crypto
		.createHash("sha256")
		.update(objectName + Date.now().toString() + salt)
		.digest("hex");

	// Truncate hash to desired length
	const shortHash = fullHash.slice(0, hashLength);

	// Build final obfuscated filename
	const obfuscatedName = extension ? `${shortHash}.${extension}` : shortHash;

	// Prefix with optional path (like folders in S3/Garage)
	const finalKey = path
		? `${path.replace(/\/+$/, "")}/${obfuscatedName}`
		: obfuscatedName;

	// Auto-size for strings/buffers
	const contentLength =
		typeof data === "string" || Buffer.isBuffer(data)
			? Buffer.byteLength(data)
			: undefined;

	// Infer MIME type from the *original* objectName extension
	const contentType =
		(mimeLookup(objectName) || undefined) ?? undefined; // e.g. image/png

	await s3Client.send(
		new PutObjectCommand({
			Bucket: BUCKET,
			Key: finalKey,
			Body: data as any, // S3Client accepts string | Uint8Array | Readable
			ContentLength: contentLength,
			ContentType: contentType, // 👈 this makes the browser render images inline
			Metadata: meta,
		})
	);

	return finalKey;
}

/**
 * Removes a single object from the configured S3-compatible bucket.
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
	await s3Client.send(
		new DeleteObjectCommand({
			Bucket: BUCKET,
			Key: objectName,
		})
	);
}

/**
 * Removes multiple objects from the configured S3-compatible bucket in one call.
 *
 * @param objectNames - An array of object keys to delete.
 * @returns A promise that resolves with the raw DeleteObjectsCommandOutput.
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
export async function removeObjects(
	objectNames: string[]
): Promise<DeleteObjectsCommandOutput> {
	if (objectNames.length === 0) {
		return {} as DeleteObjectsCommandOutput;
	}

	return await s3Client.send(
		new DeleteObjectsCommand({
			Bucket: BUCKET,
			Delete: {
				Objects: objectNames.map((Key) => ({ Key })),
				Quiet: false,
			},
		})
	);
}