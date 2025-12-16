import { useState, type SyntheticEvent } from "react";
import { ResizableRoot, ResizableHandle } from "prosekit/react/resizable";
import type { ReactNodeViewProps } from "prosekit/react";
import { IconArrowsDiagonal2 } from "@tabler/icons-react";
import { Button } from "@repo/ui/components/button";

export default function VideoView(props: ReactNodeViewProps) {
	const attrs = props.node.attrs as {
		src: string;
		width?: number;
		height?: number;
		controls?: boolean;
		autoplay?: boolean;
		loop?: boolean;
		muted?: boolean;
	};

	const [aspectRatio, setAspectRatio] = useState<number | undefined>();
	const url = attrs.src || "";

	const handleLoadedMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
		const video = event.currentTarget;
		const { videoWidth, videoHeight } = video;
		const ratio = videoWidth / videoHeight;
		if (ratio && Number.isFinite(ratio)) setAspectRatio(ratio);

		if (videoWidth && videoHeight && (!attrs.width || !attrs.height)) {
			props.setAttrs({ width: videoWidth, height: videoHeight });
		}
	};

	// Handy toggler function for any boolean attr
	const toggleAttr = (key: keyof typeof attrs) => {
		props.setAttrs({ [key]: !attrs[key] });
	};

	return (
		<ResizableRoot
			width={attrs.width ?? undefined}
			height={attrs.height ?? undefined}
			aspectRatio={aspectRatio}
			onResizeEnd={(event) => props.setAttrs(event.detail)}
			data-selected={props.selected ? "" : undefined}
			className="relative flex items-center justify-center box-border overflow-hidden my-2 group max-h-[600px] max-w-full min-h-16 min-w-16 outline-transparent! border-transparent! rounded-lg"
		>
			{url && (
				<video
					src={url}
					controls={attrs.controls}
					autoPlay={attrs.autoplay}
					loop={attrs.loop}
					muted={attrs.muted}
					onLoadedMetadata={handleLoadedMetadata}
					className="h-full w-full max-w-full max-h-full object-contain bg-black/20"
				/>
			)}

			{/* Show handle + toggles only when node is editable */}
			{props.view.editable && (
				<div className="absolute bottom-0 right-0 m-2 flex flex-col items-end gap-2">
					{/* settings panel */}
					<div className="flex flex-col gap-1 bg-black/50 text-white text-xs rounded-md p-2 backdrop-blur-sm">
						<Button onClick={() => toggleAttr("autoplay")}>
							{attrs.autoplay ? "✅ Autoplay" : "❌ Autoplay"}
						</Button>
						<Button onClick={() => toggleAttr("loop")}>{attrs.loop ? "✅ Loop" : "❌ Loop"}</Button>
						<Button onClick={() => toggleAttr("muted")}>{attrs.muted ? "✅ Muted" : "❌ Muted"}</Button>
						<Button onClick={() => toggleAttr("controls")}>
							{attrs.controls ? "✅ Controls" : "❌ Controls"}
						</Button>
					</div>
					{/* resize handle */}
					<ResizableHandle
						className="rounded-sm p-1 transition bg-accent/50 active:bg-accent hover:bg-accent/80 text-foreground/50 active:text-foreground/80 active:translate-x-0.5 active:translate-y-0.5 opacity-80"
						position="bottom-right"
					>
						<IconArrowsDiagonal2 className="size-4 block" />
					</ResizableHandle>
				</div>
			)}
		</ResizableRoot>
	);
}
