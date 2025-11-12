"use client";

import { type FilePanelProps, useBlockNoteEditor } from "@blocknote/react";
import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Tile, TileAction, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { useStateManagement, useStateManagementInfiniteFetch } from "@repo/ui/hooks/useStateManagement.ts";
import { IconArrowRight } from "@tabler/icons-react";
import React from "react";

type FileItem = {
	id: string;
	name: string;
	type: string;
	size: string;
	url: string;
};

export function CustomFilePanel({ props }: { props: FilePanelProps }) {
	const editor = useBlockNoteEditor();
	const { value: organization } = useStateManagement<schema.OrganizationWithMembers>("organization", null, 1);

	// --- Infinite fetch for organization assets ---
	const { value } = useStateManagementInfiniteFetch<{
		data: FileItem[];
		pagination: { nextCursor?: string };
	}>({
		key: ["files", organization.id],
		fetch: {
			url: `${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/${organization.id}/files`,
			custom: async (url, cursor) => {
				const fullUrl = cursor ? `${url}?cursor=${cursor}` : url;
				const res = await fetch(fullUrl, {
					credentials: "include", // ensure cookies/session
				});
				if (!res.ok) throw new Error(`Failed: ${res.statusText}`);
				return res.json();
			},
			getNextPageParam: (lastPage) => lastPage?.pagination?.nextCursor,
		},
	});

	// Flatten paginated data
	const files = React.useMemo(() => {
		return value.data?.flatMap((page) => page.data) ?? [];
	}, [value.data]);

	const blockType = props.block?.type ?? "file";

	// --- Custom labels for block types ---
	const getBlockTypeLabel = (type: string): string => {
		if (type.includes("image")) return "Image";
		if (type.includes("video")) return "Video";
		if (type.includes("audio")) return "Audio";
		if (type.includes("pdf")) return "PDF Document";
		return "File";
	};

	// --- Filter files based on block type ---
	const filteredFiles = React.useMemo(() => {
		if (blockType.includes("image")) return files.filter((f) => f.type.startsWith("image/"));
		if (blockType.includes("video")) return files.filter((f) => f.type.startsWith("video/"));
		if (blockType.includes("audio")) return files.filter((f) => f.type.startsWith("audio/"));
		if (blockType.includes("pdf")) return files.filter((f) => f.type === "application/pdf");
		return files;
	}, [blockType, files]);

	// --- Handle file selection ---
	const handleSelect = (file: FileItem) => {
		const block = editor.getBlock(props.block.id);
		if (!block) return;
		editor.updateBlock(block, {
			props: {
				name: file.name,
				url: file.url,
			},
		});
	};

	// --- Render preview based on MIME type ---
	const renderPreview = (file: FileItem) => {
		if (file.type.startsWith("image/")) {
			return (
				// biome-ignore lint/performance/noImgElement: <test>
				<img src={file.url} alt={file.name} className="h-24 object-cover" loading="lazy" />
			);
		}
		if (file.type.startsWith("video/")) {
			return <video src={file.url} className="h-24 w-24 object-cover rounded-md border" muted playsInline />;
		}
		if (file.type.startsWith("audio/")) {
			// biome-ignore lint/a11y/useMediaCaption: <test>
			return <audio src={file.url} controls className="w-24" />;
		}
		if (file.type === "application/pdf") {
			return <iframe src={file.url} className="h-24 w-24 border rounded-md" title={file.name} />;
		}

		const ext = file.name.split(".").pop()?.toUpperCase();
		return (
			<div className="flex h-24 w-24 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
				.{ext}
			</div>
		);
	};

	// --- Rendering states ---
	if (value.isLoading) return <div className="p-4 text-center text-sm text-muted-foreground">Loading assets...</div>;

	return (
		<div className="border rounded-md bg-background md:w-lg w-56">
			<ScrollArea className="h-[320px]">
				<div className="grid gap-2 grid-cols-2 p-2">
					{filteredFiles.map((file) => (
						<button
							type="button"
							key={file.id}
							onClick={() => handleSelect(file)}
							className="aspect-square rounded-lg flex p-1 items-center w-full justify-center h-full bg-accent [&_img]:h-32 place-items-center border border-transparent hover:bg-accent/80 transition-all hover:border-border"
						>
							{renderPreview(file)}
						</button>
						// <Card
						// 	key={file.id}
						// 	className="flex items-center justify-between hover:bg-secondary transition-colors"
						// >
						// 	<CardHeader className="w-32 flex items-center justify-center">{renderPreview(file)}</CardHeader>

						// 	<CardContent className="flex-1 flex flex-col items-start justify-center">
						// 		<CardTitle className="text-sm">{file.name}</CardTitle>
						// 		<span className="text-xs text-muted-foreground">{file.size}</span>
						// 	</CardContent>

						// 	<div className="p-2">
						// 		<Button size="sm" onClick={() => handleSelect(file)}>
						// 			Select
						// 		</Button>
						// 	</div>
						// </Card>
					))}

					{filteredFiles.length === 0 && (
						<div className="text-center text-sm text-muted-foreground py-10">
							No files available for this type.
						</div>
					)}

					{value.hasNextPage && (
						<div className="flex justify-center py-3">
							<Button
								variant="outline"
								size="sm"
								onClick={() => value.fetchNextPage()}
								disabled={value.isFetchingNextPage}
							>
								{value.isFetchingNextPage ? "Loading..." : "Load more"}
							</Button>
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
