import { Dialog, DialogContent, DialogOverlay } from "@repo/ui/components/dialog";
import GifPicker from "gif-picker-react";
import type { BasicExtension } from "prosekit/basic";
import type { Editor } from "prosekit/core";

type GifPickerModalProps = {
	editor: Editor<BasicExtension>;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

/**
 * Shadcn‑based Tenor GIF picker used inside the Slash Menu.
 */
export function GifPickerModal({ editor, open, onOpenChange }: GifPickerModalProps) {
	const handleGifSelect = (gif: { url?: string }) => {
		if (!gif?.url) return onOpenChange(false);
		const { state, view } = editor;
		const gifNode = state.schema.nodes.gif;
		if (!gifNode) return onOpenChange(false);

		const node = gifNode.create({ src: gif.url });
		const tr = state.tr.replaceSelectionWith(node).scrollIntoView();
		view.dispatch(tr);

		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="p-0 border-none overflow-hidden
                   
                   w-[400px] max-w-[calc(100%-2rem)]
                   data-[state=open]:animate-scale-in"
				showClose={false}
			>
				<GifPicker
					tenorApiKey={import.meta.env.VITE_TENOR_API ?? ""}
					clientKey="sayr.io"
					onGifClick={handleGifSelect}
					width={400}
					height={460}
					//@ts-expect-error theme isn't typed in library
					theme="dark"
				/>
			</DialogContent>
		</Dialog>
	);
}
