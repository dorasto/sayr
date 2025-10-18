/**
 * Sends a message to another window using `window.postMessage`.
 *
 * @template T - The type of the message payload
 *
 * @param target - The target window (e.g., `iframe.contentWindow` or `window.open()` handle)
 * @param message - The message payload
 * @param targetOrigin - The origin to restrict the message to (use "*" for same-origin or testing)
 *
 * @example
 * ```ts
 * sendWindowMessage(window, { type: "PING" }, "*");
 * ```
 */
export function sendWindowMessage<T = unknown>(target: Window, message: T, targetOrigin: string = "*") {
	target.postMessage(message, targetOrigin);
}

/**
 * Subscribes to window messages filtered by origin.
 *
 * @template T - Expected message payload type
 *
 * @param origin - The allowed origin to receive messages from (use "*" to accept any origin)
 * @param handler - Callback invoked when a message is received
 * @returns A cleanup function to remove the listener
 *
 * @example
 * ```ts
 * const unsubscribe = onWindowMessage("*", (msg) => {
 *   console.log("Got message:", msg);
 * });
 *
 * // later...
 * unsubscribe();
 * ```
 */
export function onWindowMessage<T = unknown>(origin: string, handler: (message: T) => void) {
	const listener = (event: MessageEvent) => {
		if (origin !== "*" && event.origin !== origin) return;
		handler(event.data);
	};

	window.addEventListener("message", listener);
	return () => window.removeEventListener("message", listener);
}
