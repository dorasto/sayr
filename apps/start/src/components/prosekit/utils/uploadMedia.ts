import GifPicker from "gif-picker-react";
import type { Editor } from "prosekit/core";
import type { ImageExtension } from "prosekit/extensions/image";

/**
 * Opens a file picker or Tenor GIF modal depending on `type`.
 * Automatically inserts the selected media node into the ProseKit editor.
 */
export async function handleMediaUpload(editor: Editor<ImageExtension>, type: "image" | "video" | "gif") {
	if (type === "gif") {
		// === TENOR GIF PICKER OVERLAY ===
		const container = document.createElement("div");
		container.className = "fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm animate-fade-in";

		const modal = document.createElement("div");
		modal.className =
			"relative w-[420px] max-w-[calc(100%-2rem)] rounded-xl overflow-hidden shadow-2xl border border-white/10 text-white bg-[#1f1f1f] animate-scale-in";

		const pickerRoot = document.createElement("div");
		modal.appendChild(pickerRoot);

		container.appendChild(modal);
		document.body.appendChild(container);

		// Load React/ReactDOM dynamically for GifPicker mount
		const [{ createElement }, { createRoot }] = await Promise.all([import("react"), import("react-dom/client")]);

		const root = createRoot(pickerRoot);

		const cleanup = () => {
			try {
				root.unmount();
			} catch {
				/* ignore unmount errors */
			}
			container.remove();
			document.removeEventListener("keydown", onKey);
		};

		// ESC key
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") cleanup();
		};
		document.addEventListener("keydown", onKey);

		// Click outside modal to close
		container.onclick = (e) => {
			if (e.target === container) cleanup();
		};

		// Inject close (“×”) button *over the picker content*
		const closeButton = document.createElement("button");
		closeButton.innerHTML = "&times;";
		closeButton.title = "Close";
		closeButton.setAttribute("aria-label", "Close GIF picker");
		closeButton.className =
			"absolute -top-2 -right-2 z-10 flex h-7 w-7 items-center justify-center text-gray-300 hover:text-white bg-black/60 backdrop-blur-sm rounded-full transition-colors";
		closeButton.onclick = cleanup;

		modal.appendChild(closeButton);

		// Insert selected GIF into editor
		const handleGifSelect = (gif: { url?: string }) => {
			if (!gif?.url) return cleanup();
			const { state, view } = editor;
			const gifNode = state.schema.nodes.gif;
			if (!gifNode) return cleanup();

			const node = gifNode.create({ src: gif.url });
			const tr = state.tr.replaceSelectionWith(node).scrollIntoView();
			view.dispatch(tr);
			cleanup();
		};

		root.render(
			createElement(GifPicker, {
				tenorApiKey: import.meta.env.VITE_TENOR_API ?? "",
				clientKey: "sayr.io",
				onGifClick: handleGifSelect,
				width: 400,
				height: 460,
				//@ts-expect-error—theme isn't typed in lib
				theme: "dark",
			})
		);

		return; // Stop here (no file picker)
	}

	// === FILE PICKER FLOW FOR IMAGE/VIDEO ===
	const input = document.createElement("input");
	input.type = "file";
	input.accept = type === "video" ? "video/*" : type === "image" ? "image/*" : "image/gif";

	input.onchange = async () => {
		const file = input.files?.[0];
		if (!file) return;

		const blobUrl = URL.createObjectURL(file);
		const { state, view } = editor;

		if (type === "video") {
			const nodeType = state.schema.nodes.video;
			if (!nodeType) return;

			const node = nodeType.create({ src: blobUrl });
			const tr = state.tr.replaceSelectionWith(node).scrollIntoView();
			view.dispatch(tr);
		} else {
			editor.commands.insertImage({ src: blobUrl });
		}
	};

	input.click();
}
