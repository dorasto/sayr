import { cn } from "@repo/ui/lib/utils";
import type { HTMLAttributes } from "react";

/** Radius-14 list shell with a hairline border; stack `ListRow`s (or your own rows) inside. */
export function ListContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"overflow-hidden rounded-portal-lg border border-portal-line bg-portal-surface shadow-portal-hl",
				className
			)}
			{...props}
		/>
	);
}

interface ListRowProps extends HTMLAttributes<HTMLDivElement> {
	/** Selected row: raised background and a 3px accent bar on the left edge (e.g. the row open in Peek). */
	selected?: boolean;
}

/** A row inside a `ListContainer`: hairline divider above (except the first), hover tint, selected style. */
export function ListRow({ selected = false, className, ...props }: ListRowProps) {
	return (
		<div
			data-selected={selected}
			className={cn(
				"relative border-portal-line border-t transition-colors first:border-t-0 focus-within:bg-portal-hover hover:bg-portal-hover",
				"data-[selected=true]:bg-portal-raised",
				"data-[selected=true]:before:absolute data-[selected=true]:before:top-3.5 data-[selected=true]:before:bottom-3.5 data-[selected=true]:before:left-0 data-[selected=true]:before:w-[3px] data-[selected=true]:before:rounded-r-[3px] data-[selected=true]:before:bg-portal-accent data-[selected=true]:before:content-['']",
				className
			)}
			{...props}
		/>
	);
}
