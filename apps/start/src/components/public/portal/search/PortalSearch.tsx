import {
	Dialog,
	DialogContent,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import { IconSearch } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchShortcut } from "@/hooks/portal/useSearchShortcut";
import { SearchPalette } from "./SearchPalette";

interface PortalSearchProps {
	orgSlug: string;
	orgId: string;
	orgShortId: string;
}

/** "⌘K" on Apple platforms, "Ctrl K" elsewhere; starts as "⌘K" so server and client markup match. */
function useShortcutHint() {
	const [hint, setHint] = useState("⌘K");
	useEffect(() => {
		const platform = typeof navigator === "undefined" ? "" : navigator.platform;
		if (platform && !/mac|iphone|ipad|ipod/i.test(platform)) setHint("Ctrl K");
	}, []);
	return hint;
}

/**
 * The public search: a top-bar field that opens the command palette dialog. Cmd/Ctrl+K and `/` open it from any
 * public page. The dialog traps focus and hands it back to whatever had it (the trigger, when clicked) on close.
 * The popup carries `portal` itself because dialogs render outside the layout's `.portal` wrapper.
 */
export function PortalSearch({ orgSlug, orgId, orgShortId }: PortalSearchProps) {
	const [open, setOpen] = useState(false);
	const hint = useShortcutHint();

	const toggle = useCallback(() => setOpen((value) => !value), []);
	const openPalette = useCallback(() => setOpen(true), []);
	const close = useCallback(() => setOpen(false), []);
	useSearchShortcut(toggle, openPalette);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				aria-label="Search"
				aria-keyshortcuts="Control+K Meta+K /"
				className="flex h-9 shrink-0 cursor-text items-center gap-2 rounded-portal-md border border-portal-line-2 bg-portal-surface px-2.5 text-portal-fg-3 outline-none transition-colors hover:border-portal-fg-3 focus-visible:border-portal-fg-3 focus-visible:ring-2 focus-visible:ring-portal-focus max-md:size-11 max-md:cursor-pointer max-md:justify-center max-md:border-transparent max-md:bg-transparent max-md:px-0 max-md:text-portal-fg-2 md:w-[236px] md:pr-2.5 md:pl-3"
			>
				<IconSearch aria-hidden className="size-4 shrink-0 max-md:size-[22px]" />
				<span className="hidden text-sm md:block">Search</span>
				<kbd className="ml-auto hidden h-5 items-center rounded-[5px] border border-portal-line-2 px-1.5 font-medium text-portal-fg-3 text-xs md:inline-flex">
					{hint}
				</kbd>
			</DialogTrigger>

			<DialogPortal>
				<DialogOverlay className="portal z-[10020] bg-black/55 backdrop-blur-none duration-120 ease-out" />
			</DialogPortal>
			<DialogContent
				showClose={false}
				overlay={false}
				preventDefaultFocus={false}
				aria-describedby={undefined}
				className="portal fixed top-[12vh] left-1/2 max-sm:top-3 z-[10021] flex max-h-[calc(100dvh-24px)] w-[min(680px,calc(100vw-24px))] max-w-none -translate-x-1/2 translate-y-0 flex-col gap-0 overflow-hidden rounded-[18px] border-portal-line-2 bg-portal-surface p-0 text-portal-fg shadow-portal-pop duration-120 ease-out data-closed:zoom-out-100 data-open:zoom-in-100 motion-safe:data-closed:zoom-out-98 motion-safe:data-open:zoom-in-98 sm:rounded-[18px]"
			>
				<DialogTitle className="sr-only">Search posts and releases</DialogTitle>
				<SearchPalette orgSlug={orgSlug} orgId={orgId} orgShortId={orgShortId} onClose={close} />
			</DialogContent>
		</Dialog>
	);
}
