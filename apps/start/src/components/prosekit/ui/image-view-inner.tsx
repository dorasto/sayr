import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/dialog";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowsDiagonal2 } from "@tabler/icons-react";
import { UploadTask } from "prosekit/extensions/file";
import type { ImageAttrs } from "prosekit/extensions/image";
import type { ReactNodeViewProps } from "prosekit/react";
import { ResizableHandle, ResizableRoot } from "prosekit/react/resizable";
import {
	type MouseEvent as ReactMouseEvent,
	type SyntheticEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

function ZoomableImage({ src, alt }: { src: string; alt: string }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [isZoomed, setIsZoomed] = useState(false);
	const [position, setPosition] = useState({ x: 50, y: 50 });

	const handleMouseMove = useCallback(
		(e: ReactMouseEvent<HTMLDivElement>) => {
			if (!isZoomed || !containerRef.current) return;
			const rect = containerRef.current.getBoundingClientRect();
			const x = ((e.clientX - rect.left) / rect.width) * 100;
			const y = ((e.clientY - rect.top) / rect.height) * 100;
			setPosition({ x, y });
		},
		[isZoomed]
	);

	const handleClick = () => {
		setIsZoomed(!isZoomed);
		if (!isZoomed) {
			setPosition({ x: 50, y: 50 });
		}
	};

	return (
		<div
			ref={containerRef}
			className={cn(
				"relative overflow-hidden w-full h-full flex items-center justify-center",
				isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
			)}
			onClick={handleClick}
			onMouseMove={handleMouseMove}
			onMouseLeave={() => isZoomed && setPosition({ x: 50, y: 50 })}
		>
			<img
				src={src}
				alt={alt}
				className="max-w-[90vw] max-h-[90vh] object-contain transition-transform duration-150 ease-out"
				style={{
					transform: isZoomed ? "scale(2)" : "scale(1)",
					transformOrigin: `${position.x}% ${position.y}%`,
				}}
				draggable={false}
			/>
		</div>
	);
}

export default function ImageView(props: ReactNodeViewProps) {
	const attrs = props.node.attrs as ImageAttrs;
	const url = attrs.src || "";
	const uploading = url.startsWith("blob:");
	const [aspectRatio, setAspectRatio] = useState<number | undefined>();
	const [dialogOpen, setDialogOpen] = useState(false);

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

	const handleImageClick = () => {
		if (!props.view.editable && url) {
			setDialogOpen(true);
		}
	};

	return (
		<>
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
						onClick={handleImageClick}
						alt="upload preview"
						className={`h-full w-full max-w-full max-h-full object-contain border-0 outline-0 ${
							!props.view.editable ? "cursor-zoom-in" : ""
						}`}
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

			{/* Lightbox dialog for readonly mode */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className=" max-w-[80vw] h-[80vh] overflow-hidden p-0 flex items-center justify-center bg-card/10 border-0 backdrop-blur">
					<DialogTitle className="sr-only">Image preview</DialogTitle>
					<ZoomableImage src={url} alt="Full size preview" />
				</DialogContent>
			</Dialog>
		</>
	);
}
