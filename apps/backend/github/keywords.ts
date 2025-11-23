export type KeywordMatch = {
	keyword: string;
	issueKey: string;
};

// ✅ Supports: "Ref 10", "Ref #10", "Fixes SA-123", "Sayr 42"
export function extractSayrKeywords(text: string): KeywordMatch[] {
	if (!text) return [];

	const regex =
		/\b(?:(Fixes|Fixed|Closes|Closed|Resolves|Resolved|Blocked by|Ref|Sayr)[\s:#-]*)#?([A-Z]+-\d+|\d+)\b/gi;

	const matches: KeywordMatch[] = [];

	// Safe loop for biome — no inline assignments
	for (;;) {
		const result = regex.exec(text);
		if (result === null) break;

		matches.push({
			keyword: result[1] ?? "",
			issueKey: result[2] ?? "",
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
