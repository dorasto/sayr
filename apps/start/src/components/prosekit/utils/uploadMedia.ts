import type { Editor } from "prosekit/core";
import type { ImageExtension } from "prosekit/extensions/image";

export async function handleMediaUpload(editor: Editor<ImageExtension>, type: "image" | "video" | "gif") {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = type === "video" ? "video/*" : type === "gif" ? "image/gif" : "image/*";

	input.onchange = async () => {
		const file = input.files?.[0];
		if (!file) return;

		// Replace with your real uploader if available
		const blobUrl = URL.createObjectURL(file);

		if (type === "video") {
			// insert the <video> node using the schema the extension registered
			const { state, view } = editor;
			const type = state.schema.nodes.video;
			if (!type) return;

			const node = type.create({ src: blobUrl });
			const tr = state.tr.replaceSelectionWith(node).scrollIntoView();
			view.dispatch(tr);
		} else {
			editor.commands.insertImage({ src: blobUrl });
		}
	};

	input.click();
}
