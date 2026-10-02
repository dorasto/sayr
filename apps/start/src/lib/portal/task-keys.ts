import { formatTaskKey } from "@repo/util";

export type TaskKeySegment =
	| { type: "text"; text: string }
	| {
			type: "taskKey";
			/** Display key via `formatTaskKey`, e.g. "SAY-69" (no parentheses). */
			key: string;
			/** The raw numeric short id for route params. */
			shortId: number;
			/** The matched source text, e.g. "(SAY-69)". */
			raw: string;
	  };

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Splits text/markdown into plain-text segments and `(PREFIX-123)` task-key tokens for the given org prefix
 * (e.g. "SAY"), so callers can render the tokens as links. Only parenthesised keys of the org's own prefix match.
 */
export function linkifyTaskKeys(text: string, orgPrefix: string): TaskKeySegment[] {
	if (!text) return [];
	if (!orgPrefix) return [{ type: "text", text }];

	const pattern = new RegExp(`\\(${escapeRegExp(orgPrefix)}-(\\d+)\\)`, "g");
	const segments: TaskKeySegment[] = [];
	let cursor = 0;

	for (const match of text.matchAll(pattern)) {
		const index = match.index ?? 0;
		if (index > cursor) segments.push({ type: "text", text: text.slice(cursor, index) });
		const shortId = Number(match[1]);
		segments.push({ type: "taskKey", key: formatTaskKey(orgPrefix, shortId), shortId, raw: match[0] });
		cursor = index + match[0].length;
	}

	if (cursor < text.length) segments.push({ type: "text", text: text.slice(cursor) });
	return segments;
}
