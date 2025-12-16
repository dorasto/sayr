import type { Editor } from "prosekit/core";
import type { ImageExtension } from "prosekit/extensions/image";

/**
 * Opens a file picker or GIF modal depending on `type`.
 * Automatically inserts the selected media node into the ProseKit editor.
 */
export async function handleMediaUpload(editor: Editor<ImageExtension>, type: "image" | "video") {
	const input = document.createElement("input");
	input.type = "file";

	if (type === "video") {
		input.accept = "video/*";
	} else {
		input.accept = "image/*";
	}

	input.onchange = async () => {
		const file = input.files?.[0];
		if (!file) return;

		// Replace with your uploader if available
		const blobUrl = URL.createObjectURL(file);

		if (type === "video") {
			const { state, view } = editor;
			const videoType = state.schema.nodes.video;
			if (!videoType) return;

			const node = videoType.create({ src: blobUrl });
			const tr = state.tr.replaceSelectionWith(node).scrollIntoView();
			view.dispatch(tr);
		} else {
			editor.commands.insertImage({ src: blobUrl });
		}
	};

	input.click();
}
