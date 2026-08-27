/** Splits a comma-separated id list, dropping empty entries. `""` yields `[]` (clears the set). */
export function parseIdList(raw: string): string[] {
	return raw
		.split(",")
		.map((id) => id.trim())
		.filter((id) => id.length > 0);
}
