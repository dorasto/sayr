import {
	Dialog,
	DialogContent,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import { Kbd } from "@repo/ui/components/kbd";
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
				className="flex h-9 shrink-0 cursor-text items-center gap-2 rounded-lg border bg-background px-2.5 text-muted-foreground outline-none transition-colors hover:border-muted-foreground focus-visible:border-muted-foreground max-md:size-11 max-md:cursor-pointer max-md:justify-center max-md:border-transparent max-md:bg-transparent max-md:px-0 md:w-[236px] md:pr-2.5 md:pl-3"
			>
				<IconSearch aria-hidden className="size-4 shrink-0 max-md:size-[22px]" />
				<span className="hidden text-sm md:block">Search</span>
				<Kbd className="ml-auto hidden md:inline-flex">{hint}</Kbd>
			</DialogTrigger>

			<DialogPortal>
				<DialogOverlay className="z-[10020] bg-black/55 backdrop-blur-none duration-120 ease-out" />
			</DialogPortal>
			<DialogContent
				showClose={false}
				overlay={false}
				preventDefaultFocus={false}
				aria-describedby={undefined}
				className="fixed top-[12vh] left-1/2 max-sm:top-3 z-[10021] flex max-h-[calc(100dvh-24px)] w-[min(680px,calc(100vw-24px))] max-w-none -translate-x-1/2 translate-y-0 flex-col gap-0 overflow-hidden rounded-2xl p-0 duration-120 ease-out data-closed:zoom-out-100 data-open:zoom-in-100 motion-safe:data-closed:zoom-out-98 motion-safe:data-open:zoom-in-98 sm:rounded-2xl"
			>
				<DialogTitle className="sr-only">Search posts and releases</DialogTitle>
				<SearchPalette orgSlug={orgSlug} orgId={orgId} orgShortId={orgShortId} onClose={close} />
			</DialogContent>
		</Dialog>
	);
}
