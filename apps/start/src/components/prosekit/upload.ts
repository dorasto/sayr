import type { NodeJSON } from "prosekit/core";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { uploadFile } from "@/lib/fetches/file";

type CommentVisibility = "internal" | "public";

/**
 * Processes uploads within a ProseKit document, replacing local blob URLs
 * with uploaded URLs from the storage service.
 */
export default async function processUploads(
	doc: NodeJSON,
	visibility: CommentVisibility,
	organizationId: string,
	toastId: string
) {
	// If there's no content, nothing to process
	if (!doc?.content) return doc;

	const updatedContent = await Promise.all(
		doc.content.map(async (node) => {
			const isMedia = node.type === "image" || node.type === "video";
			const isLocalBlob = typeof node.attrs?.src === "string" && node.attrs.src.startsWith("blob:");

			if (isMedia && isLocalBlob) {
				headlessToast.info({
					title: "Uploading media...",
					description: "Your file is being uploaded. This may take a few moments.",
					id: toastId || "comment-upload-status",
				});

				try {
					// Fetch and convert the blob from the local URL
					const blob = await fetch(node.attrs?.src).then((res) => res.blob());

					const extension = blob.type.split("/")[1];
					const fileName = `upload-${Date.now()}.${extension}`;
					const file = new File([blob], fileName, { type: blob.type });

					// Upload based on visibility (internal or public)
					const result =
						visibility === "internal" ? await uploadFile(file, organizationId) : await uploadFile(file);

					if (result.success && result.data?.url) {
						// Clean up the local blob
						URL.revokeObjectURL(node.attrs?.src);

						// Replace the node's src with the uploaded file URL
						return {
							...node,
							attrs: { ...node.attrs, src: result.data.url },
						};
					}
				} catch (err) {
					console.error("⚠️ Failed to upload media:", err);
					headlessToast.error({
						title: "Upload failed",
						description: "Something went wrong while uploading your file.",
						id: "comment-upload-status",
					});
				}
			}

			// Return unchanged node if no upload is needed
			return node;
		})
	);

	return { ...doc, content: updatedContent };
}
