import { useEffect, useState } from "react";

/**
 * Debounces a fast-changing value (typically search input) and returns the
 * settled result after `delay` ms of no further changes.
 *
 * This is the shared replacement for the several hand-rolled
 * `useState` + `useEffect(setTimeout)` debounced-value patterns that used to
 * be copy-pasted across mention/search/table-filter components. For
 * debouncing an *async function call* (not a value) with cancel/flush
 * control, use `useDebounceAsync` instead.
 *
 * @example
 * ```ts
 * const [query, setQuery] = useState("");
 * const debouncedQuery = useDebouncedValue(query, 300);
 * ```
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);

	return debounced;
}
