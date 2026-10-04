import { Button } from "@repo/ui/components/button";
import { CommandDialog } from "@repo/ui/components/command";
import { DialogTitle } from "@repo/ui/components/dialog";
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
 * public page. The dialog is the shared `CommandDialog`, the same one the admin palette uses.
 */
export function PortalSearch({ orgSlug, orgId, orgShortId }: PortalSearchProps) {
	const [open, setOpen] = useState(false);
	const hint = useShortcutHint();

	const toggle = useCallback(() => setOpen((value) => !value), []);
	const openPalette = useCallback(() => setOpen(true), []);
	const close = useCallback(() => setOpen(false), []);
	useSearchShortcut(toggle, openPalette);

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={openPalette}
				aria-label="Search"
				aria-keyshortcuts="Control+K Meta+K /"
				className="shrink-0 cursor-text justify-start gap-2 rounded-lg bg-background px-2.5 font-normal text-muted-foreground hover:text-foreground max-md:size-11 max-md:cursor-pointer max-md:justify-center max-md:border-transparent max-md:bg-transparent max-md:px-0 md:w-[236px] md:pl-3"
			>
				<IconSearch aria-hidden className="max-md:size-[22px]!" />
				<span className="hidden md:block">Search</span>
				<Kbd className="ml-auto hidden md:inline-flex">{hint}</Kbd>
			</Button>

			<CommandDialog open={open} onOpenChange={setOpen} commandProps={{ shouldFilter: false, loop: true }}>
				<DialogTitle className="sr-only">Search posts and releases</DialogTitle>
				{open && <SearchPalette orgSlug={orgSlug} orgId={orgId} orgShortId={orgShortId} onClose={close} />}
			</CommandDialog>
		</>
	);
}
