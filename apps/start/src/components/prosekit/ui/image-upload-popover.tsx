import type { Uploader } from "prosekit/extensions/file";
import type { ImageExtension } from "prosekit/extensions/image";
import { useEditor } from "prosekit/react";
import {
	PopoverContent,
	PopoverRoot,
	PopoverTrigger,
} from "prosekit/react/popover";
import { type ReactNode, useId, useState } from "react";

import { Button } from "./button";

export default function ImageUploadPopover(props: {
	uploader: Uploader<string>;
	tooltip: string;
	disabled: boolean;
	children: ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const [url, setUrl] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const ariaId = useId();

	const editor = useEditor<ImageExtension>();

	const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (
		event,
	) => {
		const file = event.target.files?.[0];

		if (file) {
			setFile(file);
			setUrl("");
		} else {
			setFile(null);
		}
	};

	const handleUrlChange: React.ChangeEventHandler<HTMLInputElement> = (
		event,
	) => {
		const url = event.target.value;

		if (url) {
			setUrl(url);
			setFile(null);
		} else {
			setUrl("");
		}
	};

	const deferResetState = () => {
		setTimeout(() => {
			setUrl("");
			setFile(null);
		}, 300);
	};

	const handleSubmit = () => {
		if (url) {
			editor.commands.insertImage({ src: url });
		} else if (file) {
			editor.commands.uploadImage({ file, uploader: props.uploader });
		}
		setOpen(false);
		deferResetState();
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			deferResetState();
		}
		setOpen(open);
	};

	return (
		<PopoverRoot open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger>
				<Button
					pressed={open}
					disabled={props.disabled}
					tooltip={props.tooltip}
				>
					{props.children}
				</Button>
			</PopoverTrigger>

			<PopoverContent className="flex flex-col gap-y-4 p-6 text-sm w-sm z-10 box-border rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg [&:not([data-state])]:hidden will-change-transform motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:zoom-in-95 motion-safe:data-[state=closed]:zoom-out-95 motion-safe:data-[state=open]:animate-duration-150 motion-safe:data-[state=closed]:animate-duration-200 motion-safe:data-[side=bottom]:slide-in-from-top-2 motion-safe:data-[side=bottom]:slide-out-to-top-2 motion-safe:data-[side=left]:slide-in-from-right-2 motion-safe:data-[side=left]:slide-out-to-right-2 motion-safe:data-[side=right]:slide-in-from-left-2 motion-safe:data-[side=right]:slide-out-to-left-2 motion-safe:data-[side=top]:slide-in-from-bottom-2 motion-safe:data-[side=top]:slide-out-to-bottom-2">
				{file ? null : (
					<>
						<label htmlFor={`id-link-${ariaId}`}>Embed Link</label>
						<input
							id={`id-link-${ariaId}`}
							className="flex h-9 rounded-md w-full bg-white dark:bg-gray-950 px-3 py-2 text-sm placeholder:text-gray-500 dark:placeholder:text-gray-500 transition border box-border border-gray-200 dark:border-gray-800 border-solid ring-0 ring-transparent focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-gray-300 focus-visible:ring-offset-0 outline-hidden focus-visible:outline-hidden file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50"
							placeholder="Paste the image link..."
							type="url"
							value={url}
							onChange={handleUrlChange}
						/>
					</>
				)}

				{url ? null : (
					<>
						<label htmlFor={`id-upload-${ariaId}`}>Upload</label>
						<input
							id={`id-upload-${ariaId}`}
							className="flex h-9 rounded-md w-full bg-white dark:bg-gray-950 px-3 py-2 text-sm placeholder:text-gray-500 dark:placeholder:text-gray-500 transition border box-border border-gray-200 dark:border-gray-800 border-solid ring-0 ring-transparent focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-gray-300 focus-visible:ring-offset-0 outline-hidden focus-visible:outline-hidden file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50"
							accept="image/*"
							type="file"
							onChange={handleFileChange}
						/>
					</>
				)}

				{url ? (
					<button
						type="button"
						className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white dark:ring-offset-gray-950 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-gray-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-0 bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:bg-gray-900/90 dark:hover:bg-gray-50/90 h-10 px-4 py-2 w-full"
						onClick={handleSubmit}
					>
						Insert Image
					</button>
				) : null}

				{file ? (
					<button
						type="button"
						className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white dark:ring-offset-gray-950 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-gray-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-0 bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:bg-gray-900/90 dark:hover:bg-gray-50/90 h-10 px-4 py-2 w-full"
						onClick={handleSubmit}
					>
						Upload Image
					</button>
				) : null}
			</PopoverContent>
		</PopoverRoot>
	);
}
