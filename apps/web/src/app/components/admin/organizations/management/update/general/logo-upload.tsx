"use client";

import { cn } from "@repo/ui/lib/utils";
import { ImagePlusIcon, XIcon } from "lucide-react";
import Image from "next/image";
import type { FileWithPreview } from "../utils/types";

interface LogoUploadProps {
	currentImage: string | null;
	openFileDialog: () => void;
	removeFile: (id: string) => void;
	files: FileWithPreview[];
	className?: string;
}

export default function LogoUpload({ currentImage, openFileDialog, removeFile, files, className }: LogoUploadProps) {
	return (
		<div className={cn(className)}>
			<div className="border-background bg-muted relative flex size-40 items-center justify-center overflow-hidden rounded-xl shadow-xs shadow-black/10 group/image">
				{currentImage && (
					<Image
						src={currentImage}
						className="size-full object-cover group-hover/image:blur-xs transition-all"
						width={160}
						height={160}
						alt="Organization logo"
					/>
				)}
				<button
					type="button"
					className="focus-visible:border-ring focus-visible:ring-ring/50 absolute flex size-8 cursor-pointer items-center justify-center rounded-full bg-muted/0 text-foreground/0 group-hover/image:text-foreground outline-none group-hover/image:bg-muted/80 hover:bg-muted focus-visible:ring-[3px] transition-all"
					onClick={openFileDialog}
					aria-label="Change organization logo"
				>
					<ImagePlusIcon size={16} aria-hidden="true" />
				</button>
				{currentImage && (
					<button
						type="button"
						className="focus-visible:border-ring focus-visible:ring-ring/50 absolute top-0 right-0 flex size-6 cursor-pointer items-center justify-center rounded-full bg-muted/0 text-foreground/0 transition-all outline-none hover:bg-muted group-hover/image:text-foreground/60 hover:text-foreground focus-visible:ring-[3px]"
						onClick={() => files[0]?.id && removeFile(files[0].id)}
						aria-label="Remove logo"
					>
						<XIcon size={12} aria-hidden="true" />
					</button>
				)}
			</div>
		</div>
	);
}
