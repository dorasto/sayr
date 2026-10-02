import { type RefObject, useEffect } from "react";

/** How long to keep following the element before giving up on the page settling. */
const SETTLE_MS = 4000;

/** Anything the user does to move the page themselves ends the follow. */
const USER_SCROLL_EVENTS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

/** Nearest scrollable ancestor of `el`, or the document when the page itself scrolls. */
function scrollParentOf(el: HTMLElement): Element {
	for (let node = el.parentElement; node; node = node.parentElement) {
		const { overflowY } = getComputedStyle(node);
		if (overflowY === "auto" || overflowY === "scroll") return node;
	}
	return document.scrollingElement ?? document.documentElement;
}

/**
 * Scrolls `ref` to the centre of its scroll area when `active` turns on, and keeps it centred while content above it is
 * still loading (lazy editors, replies fetched after mount) and pushing it down. Stops once the user scrolls, clicks,
 * touches or types, or after a few seconds. Used for `?comment=<id>` permalinks.
 */
export function useScrollIntoViewWhileSettling(ref: RefObject<HTMLElement | null>, active: boolean) {
	useEffect(() => {
		const el = ref.current;
		if (!active || !el) return;

		const scroller = scrollParentOf(el);
		// Scroll only the scroll area itself: `scrollIntoView` would also shift `overflow: hidden` ancestors (it pushed
		// the panel header out of view).
		const center = () => {
			const target = el.getBoundingClientRect();
			const area =
				scroller === document.scrollingElement
					? { top: 0, height: window.innerHeight }
					: scroller.getBoundingClientRect();
			scroller.scrollTop += target.top - area.top - (area.height - target.height) / 2;
		};
		const observer = new ResizeObserver(center);
		const contents = scroller === document.scrollingElement ? [document.body] : Array.from(scroller.children);
		for (const content of contents) observer.observe(content);

		const stop = () => {
			observer.disconnect();
			window.clearTimeout(timer);
			for (const type of USER_SCROLL_EVENTS) window.removeEventListener(type, stop, true);
		};
		const timer = window.setTimeout(stop, SETTLE_MS);
		for (const type of USER_SCROLL_EVENTS) window.addEventListener(type, stop, { capture: true, passive: true });

		center();
		return stop;
	}, [ref, active]);
}
