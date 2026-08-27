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
