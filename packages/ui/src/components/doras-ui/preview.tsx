"use client";

import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@repo/ui/components/hover-card";
import { cn } from "@repo/ui/lib/utils";
import { IconExternalLink } from "@tabler/icons-react";
import { useEffect, useState } from "react";

type PreviewMetadata = {
	title: string | null;
	description: string | null;
	image: string | null;
	url: string | null;
};

export interface PreviewProps {
	url: string;
	children?: React.ReactNode;
	showImage?: boolean;
	showTitle?: boolean;
	showDescription?: boolean;
	className?: string;
	contentClassName?: string;
	onError?: (error: Error) => void;
}

const fetchMetadata = async (url: string): Promise<PreviewMetadata | null> => {
	try {
		// Use a CORS proxy for client-side requests
		const proxyUrl = `/api/image-preview?url=${encodeURIComponent(url)}`;
		const response = await fetch(proxyUrl);

		if (!response.ok) {
			throw new Error(`Failed to fetch metadata: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		return null;
	}
};

export function Preview({
	url,
	children,
	showImage = true,
	showTitle = true,
	showDescription = true,
	className,
	contentClassName,
	onError,
}: PreviewProps) {
	const [metadata, setMetadata] = useState<PreviewMetadata | null>(null);
	const [loading, setLoading] = useState(true);
	const [isFailed, setIsFailed] = useState(false);

	useEffect(() => {
		async function fetchData() {
			setLoading(true);
			setIsFailed(false);
			try {
				const data = await fetchMetadata(url);
				if (data && (data.title || data.description || data.image)) {
					setMetadata(data);
				} else {
					setIsFailed(true);
				}
			} catch (error) {
				const err = error instanceof Error ? error : new Error("Unknown error");
				onError?.(err);
				setIsFailed(true);
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, [url, onError]);

	const defaultTrigger = (
		<a
			href={url}
			className="text-primary hover:underline inline-flex items-center gap-1"
		>
			{new URL(url).hostname}
			<IconExternalLink className="size-3" />
		</a>
	);

	if (isFailed) {
		return <>{children || defaultTrigger}</>;
	}

	return (
		<HoverCard openDelay={200}>
			<HoverCardTrigger asChild className={className}>
				{children || defaultTrigger}
			</HoverCardTrigger>
			<HoverCardContent
				className={cn(
					"md:w-80 p-0 overflow-hidden border rounded-lg no-underline! select-none!",
					contentClassName,
				)}
			>
				<a href={url} className="no-underline! pointer-events-auto! block">
					{loading ? (
						<div className="flex items-center justify-center py-4">
							<div className="text-sm text-muted-foreground">Loading...</div>
						</div>
					) : (
						<div className="no-underline!">
							{showImage && metadata?.image && (
								<img
									src={metadata.image}
									alt={metadata.title || ""}
									className="aspect-video w-full border object-cover bg-muted m-0!"
								/>
							)}
							<div className="p-3 no-underline!">
								{showTitle && metadata?.title && (
									<h4 className="font-semibold text-sm leading-tight no-underline! m-0!">
										{metadata.title}
									</h4>
								)}
								{showDescription && metadata?.description && (
									<p className="text-muted-foreground text-xs leading-relaxed line-clamp-2 p-0!">
										{metadata.description}
									</p>
								)}
							</div>
						</div>
					)}
				</a>
			</HoverCardContent>
		</HoverCard>
	);
}
