export type KeywordMatch = {
	keyword: string;
	taskKey: number;
};

// ✅ Supports: "Ref 10", "Ref #10", "Fixes SA-123", "Sayr 42"
export function extractSayrKeywords(text: string): KeywordMatch[] {
	if (!text) return [];

	// Only match digits for the second capture group.
	// Will handle "Fixes 10", "Ref #15", "Sayr 42" etc.
	const regex = /\b(?:(Fixes|Fixed|Closes|Closed|Resolves|Resolved|Blocked by|Ref|Sayr)[\s:#-]*)#?(\d+)\b/gi;

	const matches: KeywordMatch[] = [];

	for (;;) {
		const result = regex.exec(text);
		if (result === null) break;

		const taskKey = Number(result[2]); // force numeric

		// Skip invalid conversions (NaN guard)
		if (Number.isNaN(taskKey)) continue;

		matches.push({
			keyword: result[1] ?? "",
			taskKey,
		});
	}

	return matches;
}

export const SAYR_KEYWORD_ACTIONS: Record<string, string> = {
	Fixes: "close",
	Fixed: "close",
	Closes: "close",
	Closed: "close",
	Resolves: "close",
	Resolved: "close",
	"Blocked by": "block",
	Ref: "link",
	Sayr: "link",
};
