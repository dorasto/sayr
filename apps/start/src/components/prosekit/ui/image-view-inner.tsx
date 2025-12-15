import { IconArrowsDiagonal2 } from "@tabler/icons-react";
import { UploadTask } from "prosekit/extensions/file";
import type { ImageAttrs } from "prosekit/extensions/image";
import type { ReactNodeViewProps } from "prosekit/react";
import { ResizableHandle, ResizableRoot } from "prosekit/react/resizable";
import { type SyntheticEvent, useEffect, useState } from "react";

export default function ImageView(props: ReactNodeViewProps) {
	const attrs = props.node.attrs as ImageAttrs;
	const url = attrs.src || "";
	const uploading = url.startsWith("blob:");
	const [aspectRatio, setAspectRatio] = useState<number | undefined>();
	useEffect(() => {
		if (!uploading) return;
		const uploadTask = UploadTask.get<string>(url);
		if (!uploadTask) return;
	}, [url, uploading]);
	const handleImageLoad = (event: SyntheticEvent) => {
		const img = event.target as HTMLImageElement;
		const { naturalWidth, naturalHeight } = img;
		const ratio = naturalWidth / naturalHeight;
		if (ratio && Number.isFinite(ratio)) {
			setAspectRatio(ratio);
		}
		if (naturalWidth && naturalHeight && (!attrs.width || !attrs.height)) {
			props.setAttrs({ width: naturalWidth, height: naturalHeight });
		}
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
				<img
					src={url}
					onLoad={handleImageLoad}
					alt="upload preview"
					className="h-full w-full max-w-full max-h-full object-contain border-0 outline-0"
				/>
			)}
			{props.view.editable && (
				<ResizableHandle
					className="absolute bottom-0 right-0 rounded-sm m-1.5 p-1 transition bg-accent/50 active:bg-accent hover:bg-accent/80 text-foreground/50 active:text-foreground/80 active:translate-x-0.5 active:translate-y-0.5 opacity-0 hover:opacity-100 group-hover:opacity-100 group-data-resizing:opacity-100"
					position="bottom-right"
				>
					<IconArrowsDiagonal2 className="size-4 block" />
				</ResizableHandle>
			)}
		</ResizableRoot>
	);
}
