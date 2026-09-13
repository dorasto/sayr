export interface UpdatedFieldValue {
	field: "title" | "description" | "visible";
	value: string | object | null;
}

/**
 * Parses the structured `{ field, value }` payload stored in a `taskTimeline` row's
 * `fromValue`/`toValue` jsonb column for an `updated` event. Returns `null` for legacy rows
 * that predate the structured format. Shared by the single-item renderer and the
 * consolidated-group summary so both agree on what field an edit touched.
 */
export function parseUpdatedField(raw: unknown): UpdatedFieldValue | null {
	if (raw && typeof raw === "object" && "field" in raw) {
		return raw as UpdatedFieldValue;
	}
	if (typeof raw === "string") {
		try {
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed === "object" && "field" in parsed) {
				return parsed as UpdatedFieldValue;
			}
		} catch {
			// legacy/unstructured value, no field to report
		}
	}
	return null;
}
