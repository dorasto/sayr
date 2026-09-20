import { ApiClientError } from "./client";

/** Validates a flag's value against an allowed set before it ever reaches the network. */
export function assertOneOf<T extends string>(
	value: string | undefined,
	allowed: readonly T[],
	flag: string
): T | undefined {
	if (value === undefined) return undefined;
	if (!(allowed as readonly string[]).includes(value)) {
		throw new ApiClientError(
			"INVALID_ARGUMENT",
			`Invalid value for ${flag}: "${value}". Expected one of: ${allowed.join(", ")}.`,
			400
		);
	}
	return value as T;
}

/**
 * Validates a date flag before it reaches the network and normalizes it to a
 * full ISO 8601 timestamp — `2026-10-31` is sent as `2026-10-31T00:00:00.000Z`.
 */
export function assertDate(value: string | undefined, flag: string): string | undefined {
	if (value === undefined) return undefined;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		throw new ApiClientError(
			"INVALID_ARGUMENT",
			`Invalid value for ${flag}: "${value}". Expected a date such as 2026-10-31 or 2026-10-31T09:00:00Z.`,
			400
		);
	}
	return parsed.toISOString();
}
