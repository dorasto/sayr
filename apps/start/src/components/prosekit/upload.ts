import type { NodeJSON } from "prosekit/core";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { uploadFile } from "@/lib/fetches/file";

type CommentVisibility = "internal" | "public";
export default async function processUploads(doc: NodeJSON, visibility: CommentVisibility, organizationId: string) {
	if (!doc?.content) return doc;

	const updatedContent = await Promise.all(
		doc.content.map(async (node) => {
			if (node.type === "image" && node.attrs?.src?.startsWith("blob:")) {
				// Show a toast or loading indicator
				headlessToast.info({
					title: "Uploading image...",
					description: "Please wait while your file is being uploaded.",
					id: "create-task-comment",
				});

				try {
					// Fetch the blob
					const blob = await fetch(node.attrs.src).then((res) => res.blob());
					const fileName = `upload-${Date.now()}.png`;
					const file = new File([blob], fileName, { type: blob.type });
					if (visibility === "internal") {
						// Your existing upload logic
						const result = await uploadFile(file, organizationId);

						if (result.success && result.data?.url) {
							URL.revokeObjectURL(node.attrs.src);
							return {
								...node,
								attrs: { ...node.attrs, src: result.data.url },
							};
						}
					} else {
						// Your existing upload logic
						const result = await uploadFile(file);

						if (result.success && result.data?.url) {
							URL.revokeObjectURL(node.attrs.src);
							return {
								...node,
								attrs: { ...node.attrs, src: result.data.url },
							};
						}
					}
				} catch (err) {
					console.error("⚠️ Image upload failed:", err);
				}
			}

			// Return unchanged node if no upload is needed
			return node;
		})
	);

	return { ...doc, content: updatedContent };
}
