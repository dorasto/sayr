import { headlessToast } from "@repo/ui/components/headless-toast";
import type { NodeJSON } from "prosekit/core";
import { uploadFile } from "@/lib/fetches/file";

type CommentVisibility = "internal" | "public";

/**
 * Recursively processes uploads within a ProseKit document,
 * replacing local blob URLs with uploaded URLs.
 */
export default async function processUploads(
	doc: NodeJSON,
	visibility: CommentVisibility,
	organizationId: string,
	toastId: string
): Promise<NodeJSON> {
	if (!doc?.content) return doc;

	const processNode = async (node: NodeJSON): Promise<NodeJSON> => {
		const isMedia = node.type === "image" || node.type === "video";
		const isLocalBlob = typeof node.attrs?.src === "string" && node.attrs.src.startsWith("blob:");

		// 1. If this node itself is an image/video with a local blob URL, upload it
		if (isMedia && isLocalBlob) {
			headlessToast.info({
				title: "Uploading media...",
				description: "Your file is being uploaded. This may take a few moments.",
				id: toastId || "comment-upload-status",
			});

			try {
				const blob = await fetch(node?.attrs?.src).then((res) => res.blob());
				const extension = blob.type.split("/")[1] || "bin";
				const fileName = `upload-${Date.now()}.${extension}`;
				const file = new File([blob], fileName, { type: blob.type });

				const result = visibility === "internal" ? await uploadFile(file, organizationId) : await uploadFile(file);

				if (result.success && result.data?.url) {
					URL.revokeObjectURL(node.attrs?.src);
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

		// 2. If this node has nested content, process it recursively
		if (Array.isArray(node.content) && node.content.length > 0) {
			const newContent = await Promise.all(node.content.map(async (child) => await processNode(child)));
			return { ...node, content: newContent };
		}

		// 3. Otherwise just return as-is
		return node;
	};

	// Process the root content recursively
	const updatedContent = await Promise.all(doc.content.map(async (node) => await processNode(node)));

	return { ...doc, content: updatedContent };
}
