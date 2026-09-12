import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Base UI nests a floating overlay's portal inside the nearest ancestor
// overlay's own portal by default (for focus-trap continuity) instead of
// `document.body`. A Dialog's Popup — or IndentDrawer's Popup, which uses the
// same pattern — centers/translates itself with a transform, which makes
// that ancestor a containing block for nested `position: fixed` descendants.
// That traps a child overlay's stacking so it renders behind (or gets
// clipped by) the ancestor no matter its own z-index. Passing this as every
// floating overlay's `Portal container` forces Base UI's own documented
// default and escapes that trap. Without it: a Select/DropdownMenu/etc. used
// as a side panel's (IndentDrawer) content silently fails to render its
// popup on top of the panel — it opens, but visually behind it.
export const overlayPortalContainer = typeof document !== "undefined" ? document.body : undefined;

export const normalizeUrl = (url: string): string => {
	// If URL doesn't start with a protocol, add https://
	if (!url.match(/^[a-zA-Z][a-zA-Z\d+\-.]*:/)) {
		return `https://${url}`;
	}
	return url;
};
