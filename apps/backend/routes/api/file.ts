import { createHash, randomBytes, randomUUID } from "node:crypto";
import { uploadObject } from "@repo/storage";
import { Hono } from "hono";
import type { AppEnv } from "@/index";

export const apiRouteFile = new Hono<AppEnv>();

// Upload a file
apiRouteFile.put("/upload", async (c) => {
	try {
		const session = c.get("session");

		if (!session?.userId) {
			return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
		}

		// Parse multipart body
		const body = await c.req.parseBody();
		const file = body.file;
		if (!file || !(file instanceof File)) {
			return c.json({ success: false, error: "No file uploaded" }, 400);
		}
		// Convert file to buffer
		const buffer = Buffer.from(await file.arrayBuffer());
		// Derive extension safely
		const ext = file.name.split(".").pop() || file.type.split("/")[1] || "bin";
		// Generate a secure, random file name (e.g. AES-grade hex string)
		// Salt to make hashes unpredictable even if filename known
		const salt = process.env.FILE_SALT || "";
		// Generate salted SHA-256 hash
		const randomName = randomBytes(32).toString("hex"); // 64 chars of entropy
		const fullHash = createHash("sha256")
			.update(session?.userId + randomName + salt)
			.digest("hex");

		const objectName = `${fullHash}.${ext}`;
		// Upload to storage
		const uploadedUrl = await uploadObject(objectName, buffer, "files", {
			"Content-Type": file.type || "application/octet-stream",
		});

		return c.json({
			success: true,
			data: {
				id: randomUUID(),
				fileName: objectName,
				url: uploadedUrl,
				originalName: file.name,
				size: file.size,
				type: file.type,
			},
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Upload failed";
		console.error("Upload failed:", message);
		return c.json({ success: false, error: "Upload failed" }, 500);
	}
});
