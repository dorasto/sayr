/**
 * The one module allowed to touch `window`/`document` (gated by `Platform.OS`,
 * per the plugin skill's rule) — everything else in `client/` typechecks
 * without the DOM library. Adapted from the installed `github-board` plugin's
 * own `client/web.ts`, which solves the exact same problem this plugin's
 * resize handle has.
 */
import { Platform } from "react-native";

/** Only what this module reads off the web globals; the DOM library stays off. */
interface WebGlobals {
	document?: {
		addEventListener?: (type: string, listener: (event: unknown) => void) => void;
		removeEventListener?: (type: string, listener: (event: unknown) => void) => void;
		body?: { style?: Record<string, string> };
	};
	addEventListener?: (type: string, listener: () => void) => void;
	removeEventListener?: (type: string, listener: () => void) => void;
}

/**
 * Follows a drag at the document level on the web renderer, where the
 * responder system alone is not enough: widening the panel means dragging
 * *left*, across the board's columns, whose scroll views ask for the
 * responder as the pointer crosses them, and a pointer moving faster than the
 * handle leaves it altogether. Document listeners see every move until the
 * button is released, wherever the pointer is — including a `blur` standing
 * in for a release the browser cannot otherwise report.
 *
 * Native has no pointer to follow at the document level and gets a no-op;
 * the responder system alone is enough there.
 */
export function trackPointerOnDocument(onMove: (clientX: number) => void, onEnd: () => void): () => void {
	if (Platform.OS !== "web") return () => {};

	const web = globalThis as WebGlobals;
	const document = web.document;
	if (
		document === undefined ||
		typeof document.addEventListener !== "function" ||
		typeof document.removeEventListener !== "function"
	) {
		return () => {};
	}

	const move = (event: unknown) => {
		const clientX = typeof event === "object" && event !== null ? Reflect.get(event, "clientX") : null;
		if (typeof clientX === "number") onMove(clientX);
	};

	/**
	 * A drag is also a mouse-down followed by movement, which is how a browser
	 * starts a text selection — once the pointer leaves the handle, every
	 * card title it crosses becomes selectable. Selection is switched off on
	 * the body for the drag's duration, and the resize cursor is pinned there
	 * too so it doesn't flicker back to an I-beam over text.
	 */
	const bodyStyle = document.body?.style;
	const previous = {
		userSelect: bodyStyle?.userSelect ?? "",
		webkitUserSelect: bodyStyle?.webkitUserSelect ?? "",
		cursor: bodyStyle?.cursor ?? "",
	};
	if (bodyStyle !== undefined) {
		bodyStyle.userSelect = "none";
		bodyStyle.webkitUserSelect = "none";
		bodyStyle.cursor = "col-resize";
	}

	let done = false;
	const end = () => {
		if (done) return;
		done = true;
		if (bodyStyle !== undefined) {
			bodyStyle.userSelect = previous.userSelect;
			bodyStyle.webkitUserSelect = previous.webkitUserSelect;
			bodyStyle.cursor = previous.cursor;
		}
		document.removeEventListener?.("pointermove", move);
		document.removeEventListener?.("pointerup", end);
		document.removeEventListener?.("pointercancel", end);
		web.removeEventListener?.("blur", end);
		onEnd();
	};

	document.addEventListener("pointermove", move);
	document.addEventListener("pointerup", end);
	document.addEventListener("pointercancel", end);
	web.addEventListener?.("blur", end);
	return end;
}
