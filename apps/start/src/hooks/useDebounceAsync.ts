import debounce from "lodash/debounce";
import { useCallback, useEffect, useMemo } from "react";

/**
 * React-safe, awaitable debounce for async functions.
 */

// biome-ignore lint/suspicious/noExplicitAny: <any>
export function useDebounceAsync<TArgs extends any[], TResult>(
	fn: (...args: TArgs) => Promise<TResult>,
	wait = 500,
) {
	// keep fn stable for lodash
	const stableFn = useCallback(fn, []);

	const debounced = useMemo(() => {
		let lastArgs: TArgs | null = null;
		let resolver: ((v: TResult) => void) | null = null;
		let rejecter: ((e: unknown) => void) | null = null;

		const runner = debounce(
			async () => {
				if (!lastArgs) return;
				try {
					const out = await stableFn(...lastArgs);
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
			{ leading: false, trailing: true },
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

		return wrapped as typeof wrapped & { cancel: () => void };
	}, [stableFn, wait]);

	useEffect(() => () => debounced.cancel(), [debounced]);

	return debounced;
}
