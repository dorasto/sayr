import debounce from "lodash/debounce";
import { useEffect, useMemo, useRef } from "react";

/**
 * React-safe, awaitable debounce for async functions.
 */

// biome-ignore lint/suspicious/noExplicitAny: <any>
export function useDebounceAsync<TArgs extends any[], TResult>(fn: (...args: TArgs) => Promise<TResult>, wait = 500) {
	// Always call the latest `fn` without resetting the debounce timer when its identity
	// changes across renders (e.g. a callback that closes over changing props).
	const fnRef = useRef(fn);
	useEffect(() => {
		fnRef.current = fn;
	}, [fn]);

	const debounced = useMemo(() => {
		let lastArgs: TArgs | null = null;
		let resolver: ((v: TResult) => void) | null = null;
		let rejecter: ((e: unknown) => void) | null = null;

		const runner = debounce(
			async () => {
				if (!lastArgs) return;
				try {
					const out = await fnRef.current(...lastArgs);
					resolver?.(out);
				} catch (err) {
					rejecter?.(err);
				} finally {
					lastArgs = null;
					resolver = null;
					rejecter = null;
				}
			},
			wait,
			{ leading: false, trailing: true }
		);

		const wrapped = (...args: TArgs): Promise<TResult> => {
			lastArgs = args;
			return new Promise<TResult>((resolve, reject) => {
				resolver = resolve;
				rejecter = reject;
				runner();
			});
		};

		wrapped.cancel = () => runner.cancel();
		wrapped.flush = () => runner.flush();

		return wrapped as typeof wrapped & { cancel: () => void; flush: () => void };
	}, [wait]);

	useEffect(() => () => debounced.cancel(), [debounced]);

	return debounced;
}
