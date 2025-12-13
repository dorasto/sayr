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
	const [error, setError] = useState<string | undefined>();
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		if (!uploading) return;

		const uploadTask = UploadTask.get<string>(url);
		if (!uploadTask) return;

		let canceled = false;

		uploadTask.finished.catch((error) => {
			if (canceled) return;
			setError(String(error));
		});
		const unsubscribeProgress = uploadTask.subscribeProgress(
			({ loaded, total }) => {
				if (canceled) return;
				setProgress(total ? loaded / total : 0);
			},
		);

		return () => {
			canceled = true;
			unsubscribeProgress();
		};
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
			className="relative flex items-center justify-center box-border overflow-hidden my-2 group max-h-[600px] max-w-full min-h-16 min-w-16 outline-2 outline-transparent data-selected:outline-blue-500 outline-solid"
		>
			{url && !error && (
				<img
					src={url}
					onLoad={handleImageLoad}
					alt="upload preview"
					className="h-full w-full max-w-full max-h-full object-contain"
				/>
			)}
			{uploading && !error && (
				<div className="absolute bottom-0 left-0 m-1 flex content-center items-center gap-2 rounded-sm bg-gray-800/60 p-1.5 text-xs text-white/80 transition">
					<div className="i-lucide-loader-circle size-4 animate-spin block"></div>
					<div>{Math.round(progress * 100)}%</div>
				</div>
			)}
			{error && (
				<div className="absolute bottom-0 left-0 right-0 top-0 flex flex-col items-center justify-center gap-4 bg-gray-200 p-2 text-sm dark:bg-gray-800 @container">
					<div className="i-lucide-image-off size-8 block"></div>
					<div className="hidden opacity-80 @xs:block">
						Failed to upload image
					</div>
				</div>
			)}
			<ResizableHandle
				className="absolute bottom-0 right-0 rounded-sm m-1.5 p-1 transition bg-gray-900/30 active:bg-gray-800/60 hover:bg-gray-800/60 text-white/50 active:text-white/80 active:translate-x-0.5 active:translate-y-0.5 opacity-0 hover:opacity-100 group-hover:opacity-100 group-data-resizing:opacity-100"
				position="bottom-right"
			>
				<div className="i-lucide-arrow-down-right size-4 block"></div>
			</ResizableHandle>
		</ResizableRoot>
	);
}
