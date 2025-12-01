"use client";

import { type FilePanelProps, useBlockNoteEditor } from "@blocknote/react";
import { Button } from "@repo/ui/components/button";
import { getFileNameFromUrl } from "@repo/util";
import React from "react";

export function CustomFilePanel({ props }: { props: FilePanelProps }) {
	const editor = useBlockNoteEditor();
	const [isLoading, setIsLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const fileInputRef = React.useRef<HTMLInputElement>(null);
	const block = props.block;

	const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		setIsLoading(true);
		setError(null);

		try {
			// Create a temporary blob URL
			const blobUrl = URL.createObjectURL(file);

			const editorBlock = editor.getBlock(block.id);
			if (editorBlock) {
				editor.updateBlock(editorBlock, {
					props: {
						// Show file name and blob URL
						name: getFileNameFromUrl(file.name),
						url: blobUrl,
						// Optional if your schema supports it
						//@ts-expect-error
						type: file.type,
					},
				});
			}

			console.log("🌀 Local blob created:", blobUrl);
		} catch (err) {
			console.error("Error creating blob:", err);
			setError("Failed to create blob URL");
		} finally {
			setIsLoading(false);
			// Reset input value so same file can be reselected later
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	return (
		<div className="flex flex-col items-center justify-center border rounded-md bg-background p-6 gap-3 w-64">
			<label className="flex flex-col items-center justify-center gap-2 cursor-pointer text-center">
				<span className="text-sm text-muted-foreground">Select a file ({block?.type ?? "file"})</span>
				<input
					ref={fileInputRef}
					type="file"
					className="hidden"
					onChange={handleFileSelect}
					accept={
						block?.type?.includes("image")
							? "image/*"
							: block?.type?.includes("video")
								? "video/*"
								: block?.type?.includes("audio")
									? "audio/*"
									: block?.type?.includes("pdf")
										? "application/pdf"
										: "*/*"
					}
				/>
				<Button variant="default" disabled={isLoading} onClick={() => fileInputRef.current?.click()}>
					{isLoading ? "Loading…" : "Choose File"}
				</Button>
			</label>

			{error && <div className="text-xs text-destructive mt-2">{error}</div>}
		</div>
	);
}
