"use client";

import { ImagePlusIcon, XIcon } from "lucide-react";
import Image from "next/image";
import type { FileWithPreview } from "../utils/types";

interface BannerUploadProps {
	currentImage: string | null;
	openFileDialog: () => void;
	removeFile: (id: string) => void;
	files: FileWithPreview[];
}

export default function BannerUpload({ currentImage, openFileDialog, removeFile, files }: BannerUploadProps) {
	return (
		<div className="w-full aspect-[21/9] max-w-1/2 mx-auto">
			<div className="bg-muted relative flex size-full items-center justify-center overflow-hidden">
				{currentImage && (
					<Image
						className="size-full object-cover"
						src={currentImage}
						alt="Organization banner"
						width={1260}
						height={540}
					/>
				)}
				<div className="absolute inset-0 flex items-center justify-center gap-2">
					<button
						type="button"
						className="focus-visible:border-ring focus-visible:ring-ring/50 z-50 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:ring-[3px]"
						onClick={openFileDialog}
						aria-label={currentImage ? "Change banner" : "Upload banner"}
					>
						<ImagePlusIcon size={16} aria-hidden="true" />
					</button>
					{currentImage && (
						<button
							type="button"
							className="focus-visible:border-ring focus-visible:ring-ring/50 z-50 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:ring-[3px]"
							onClick={() => files[0]?.id && removeFile(files[0].id)}
							aria-label="Remove banner"
						>
							<XIcon size={16} aria-hidden="true" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
