const API_URL = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api" : "/api";

/**
 * Uploads a file to the `/file/upload` endpoint.
 *
 * Sends a `PUT` request with `FormData` containing the selected file.
 * The API returns a JSON object containing the uploaded file's URL.
 *
 * @param file - The `File` object to upload (from a file input element).
 * @param orgId - Optional organization ID for private file uploads.
 * @returns A promise resolving to:
 * - `success` — Indicates whether the upload succeeded.
 * - `data` — The uploaded file details, including the `url`.
 * - `error` — Optional error message if upload fails.
 *
 * @example
 * ```ts
 * const file = input.files?.[0];
 * if (file) {
 *   const result = await uploadFile(file);
 *   if (result.success) {
 *     console.log("Uploaded to:", result.data.url);
 *   } else {
 *     console.error("Upload failed:", result.error);
 *   }
 * }
 * ```
 */
export async function uploadFile(
	file: File,
	orgId?: string
): Promise<{
	success: boolean;
	data?: { url: string };
	error?: string;
}> {
	const uploadStart = Date.now();

	try {
		const formData = new FormData();
		formData.append("file", file);

		console.info("client.upload.start", {
			message: "Started file upload",
			fileName: file.name,
			fileSize: file.size,
			mimeType: file.type,
			timestamp: uploadStart,
		});

		const res = await fetch(`${API_URL}/file`, {
			method: "PUT",
			body: formData,
			credentials: "include",
			headers: {
				"X-File-Privacy": orgId ? orgId : "public",
			},
		});

		if (!res.ok) {
			const msg = `Upload failed: ${res.status} ${res.statusText}`;
			console.error("client.upload.failed", {
				fileName: file.name,
				error: msg,
			});
			throw new Error(msg);
		}

		const uploaded = (await res.json()) as { url: string };

		const duration = Date.now() - uploadStart;

		console.info("client.upload.success", {
			message: "File uploaded successfully",
			fileName: file.name,
			uploadDurationMs: duration,
			fileUrl: uploaded.url,
		});

		return {
			success: true,
			data: uploaded,
		};
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : "Unknown upload error";

		console.error("client.upload.error", {
			message: "File upload encountered an error",
			fileName: file.name,
			error: errorMessage,
		});

		return {
			success: false,
			error: errorMessage,
		};
	}
}

/**
 * Deletes a file from the `/file/delete` endpoint.
 *
 * Sends a `DELETE` request with JSON containing the file identifier (URL or ID).
 * The API is expected to remove the file and return a success response.
 *
 * @param fileUrl - The full URL or unique identifier of the file to delete.
 * @returns A promise resolving to:
 * - `success` — Indicates whether deletion succeeded.
 * - `message` — The server's confirmation or response message.
 * - `error` — Optional error message if deletion fails.
 *
 * @example
 * ```ts
 * const result = await deleteFile("https://cdn.example.com/uploads/example.png");
 *
 * if (result.success) {
 *   console.log("File deleted successfully");
 * } else {
 *   console.error("File delete failed:", result.error);
 * }
 * ```
 */
export async function deleteFile(fileUrl: string): Promise<{
	success: boolean;
	message?: string;
	error?: string;
}> {
	const deleteStart = Date.now();

	try {
		console.info("client.delete.start", {
			message: "Starting file deletion",
			fileUrl,
			timestamp: deleteStart,
		});

		const res = await fetch(`${API_URL}/file`, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
			body: JSON.stringify({ url: fileUrl }),
		});

		if (!res.ok) {
			const msg = `Delete failed: ${res.status} ${res.statusText}`;
			console.error("client.delete.failed", { fileUrl, error: msg });
			throw new Error(msg);
		}

		const response = await res.json();
		const duration = Date.now() - deleteStart;

		console.info("client.delete.success", {
			message: "File deleted successfully",
			fileUrl,
			deleteDurationMs: duration,
			response,
		});

		return {
			success: true,
			message: response.message ?? "Deleted successfully",
		};
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : "Unknown delete error";

		console.error("client.delete.error", {
			message: "File deletion encountered an error",
			fileUrl,
			error: errorMessage,
		});

		return {
			success: false,
			error: errorMessage,
		};
	}
}
