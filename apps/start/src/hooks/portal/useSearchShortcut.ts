import { useEffect } from "react";
import { getSearchShortcut } from "@/lib/portal/search";

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]';

/** Cmd/Ctrl+K toggles and `/` opens the public search palette (see `getSearchShortcut` for the rules). */
export function useSearchShortcut(onToggle: () => void, onOpen: () => void) {
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const target = event.target instanceof Element ? event.target : null;
			const action = getSearchShortcut({
				key: event.key,
				metaKey: event.metaKey,
				ctrlKey: event.ctrlKey,
				altKey: event.altKey,
				shiftKey: event.shiftKey,
				repeat: event.repeat,
				isComposing: event.isComposing,
				defaultPrevented: event.defaultPrevented,
				targetIsEditable:
					!!target &&
					(target.closest(EDITABLE_SELECTOR) !== null ||
						(target instanceof HTMLElement && target.isContentEditable)),
				targetInDialog: !!target && target.closest('[role="dialog"], [role="alertdialog"]') !== null,
			});
			if (!action) return;
			event.preventDefault();
			if (action === "toggle") onToggle();
			else onOpen();
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onToggle, onOpen]);
}
