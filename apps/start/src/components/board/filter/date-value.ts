import type { DateRangeValue, FilterOperator, FilterValue } from "./types";

// Pure conversions between a date filter condition's stored value and the `<input type="date">` strings
// the filter builder's date control edits. Stored values are ISO instants at a LOCAL day boundary, so a
// picked day means the whole day in the viewer's timezone: "before D" = before D's start, "after D" = after
// D's end, "between A and B" = from A's start through B's end (inclusive).

/** "YYYY-MM-DD" for the local day of `value` ("" when absent/invalid). */
export function toDateInputValue(value: string | undefined): string {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The ISO instant at the start (or end) of the local day a "YYYY-MM-DD" input names ("" when empty/invalid). */
export function fromDateInputValue(input: string, boundary: "start" | "end"): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
	if (!match) return "";
	const [, year, month, day] = match;
	const date =
		boundary === "start"
			? new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0)
			: new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999);
	return date.toISOString();
}

function isRange(value: FilterValue): value is DateRangeValue {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The stored start/end of a date condition, whatever shape its value currently has. */
export function readDateRange(value: FilterValue): { start: string; end: string } {
	if (isRange(value)) return { start: value.start ?? "", end: value.end ?? "" };
	if (typeof value === "string") return { start: value, end: "" };
	if (Array.isArray(value)) return { start: value[0] ?? "", end: "" };
	return { start: "", end: "" };
}

/** The value to store after the date control changes one input. */
export function buildDateFilterValue(
	operator: FilterOperator,
	current: FilterValue,
	part: "start" | "end",
	input: string
): FilterValue {
	if (operator === "between") {
		const range = readDateRange(current);
		return { ...range, [part]: fromDateInputValue(input, part) };
	}
	// before = earlier than the day's start; after = later than the day's end.
	return fromDateInputValue(input, operator === "after" ? "end" : "start");
}
