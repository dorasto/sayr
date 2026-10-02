/** Anything the API/DB can hand us for a timestamp (Date objects from SSR, ISO strings from JSON). */
export type PortalDateInput = Date | string | number | null | undefined;

/** Epoch ms for a date-ish value, or `null` when missing/invalid. */
export function toTime(value: PortalDateInput): number | null {
	if (value === null || value === undefined) return null;
	const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
	return Number.isNaN(time) ? null : time;
}

/** `Date` for a date-ish value, or `null` when missing/invalid. */
export function toDate(value: PortalDateInput): Date | null {
	const time = toTime(value);
	return time === null ? null : new Date(time);
}
