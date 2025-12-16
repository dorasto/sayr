import { ResizableRoot, ResizableHandle } from "prosekit/react/resizable";
import type { ReactNodeViewProps } from "prosekit/react";
import { IconArrowsDiagonal2 } from "@tabler/icons-react";

export default function GifView(props: ReactNodeViewProps) {
	const attrs = props.node.attrs as {
		src: string;
		width?: number;
		height?: number;
	};

	return (
		<ResizableRoot
			width={attrs.width ?? undefined}
			height={attrs.height ?? undefined}
			onResizeEnd={(event) => props.setAttrs(event.detail)}
			data-selected={props.selected ? "" : undefined}
			className="relative flex items-center justify-center box-border overflow-hidden my-2 group max-h-fit max-w-fit min-h-16 min-w-16 outline-transparent! border-transparent! rounded-lg"
		>
			{attrs.src ? (
				<img src={attrs.src} alt="GIF" className="h-auto w-auto max-w-full max-h-full object-contain bg-black/10" />
			) : (
				<div className="text-sm text-gray-500">No GIF selected</div>
			)}

			{props.view.editable && (
				<div className="absolute bottom-0 right-0 m-2 flex flex-col items-end gap-2">
					<ResizableHandle
						position="bottom-right"
						className="rounded-sm p-1 transition bg-accent/50 active:bg-accent hover:bg-accent/80 text-foreground/50 active:text-foreground/80 active:translate-x-0.5 active:translate-y-0.5 opacity-80"
					>
						<IconArrowsDiagonal2 className="size-4 block" />
					</ResizableHandle>
				</div>
			)}
		</ResizableRoot>
	);
}
