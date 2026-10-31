// Pure half of the board's "open item" hook (BoardDataSource.openItem): which clicks on a row/card's
// link a host may take over. Kept free of React and `@/` imports so vitest can cover it.

/** The parts of a mouse event that decide whether it is a plain "open here" click. */
export interface OpenItemClick {
	button: number;
	metaKey: boolean;
	ctrlKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
	defaultPrevented: boolean;
}

/**
 * True for a plain primary-button click with no modifier — the only click a host's `openItem` replaces.
 * Cmd/Ctrl/Shift/Alt-click and middle-click keep the link's own behaviour (new tab/window, download), and a
 * click something else already handled is left alone.
 */
export function isPlainLeftClick(event: OpenItemClick): boolean {
	return (
		!event.defaultPrevented &&
		event.button === 0 &&
		!event.metaKey &&
		!event.ctrlKey &&
		!event.shiftKey &&
		!event.altKey
	);
}
