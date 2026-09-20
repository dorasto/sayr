import { ApiClientError } from "./client";
import { listCategories, listLabels } from "./lookups";

/** Ids are `randomUUID()` values, so anything shaped like one is an id — never worth a lookup. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** An id-shaped value (or an empty one) is sent exactly as typed, with no request to look anything up. */
function passesThrough(value: string): boolean {
	return UUID.test(value) || value.trim() === "";
}

interface Named {
	id: string;
	name: string;
}

/** What is being looked up, singular and plural, for the error messages. */
interface Kind {
	one: string;
	many: string;
}

const CATEGORY: Kind = { one: "category", many: "categories" };
const LABEL: Kind = { one: "label", many: "labels" };

/**
 * Finds the one item whose name matches `value` (case-insensitively). A value that is an item's exact id also
 * counts, for ids that aren't UUID-shaped. Anything else — no match, or several — is an INVALID_ARGUMENT that
 * lists the names the organization does have, the same way `assertOneOf` lists the allowed values.
 */
function matchByName(items: readonly Named[], value: string, kind: Kind, flag: string): string {
	const wanted = value.trim().toLowerCase();
	const byName = items.filter((item) => item.name.toLowerCase() === wanted);

	const [only] = byName;
	if (only && byName.length === 1) return only.id;
	if (byName.length > 1) {
		throw new ApiClientError(
			"INVALID_ARGUMENT",
			`Ambiguous value for ${flag}: "${value}" matches ${byName.length} ${kind.many} (${byName.map((item) => `${item.name}, id ${item.id}`).join("; ")}). Pass the id instead.`,
			400
		);
	}

	const byId = items.find((item) => item.id === value);
	if (byId) return byId.id;

	const expected =
		items.length === 0
			? `This organization has no ${kind.many}.`
			: `Expected a ${kind.one} id or one of these names: ${items.map((item) => item.name).join(", ")}.`;
	throw new ApiClientError("INVALID_ARGUMENT", `Invalid value for ${flag}: "${value}". ${expected}`, 400);
}

/** `--category <name|id>` → the category id. A UUID is returned untouched, without asking the API anything. */
export async function resolveCategory(orgId: string, value: string, flag: string): Promise<string> {
	if (passesThrough(value)) return value;
	return matchByName(await listCategories(orgId), value, CATEGORY, flag);
}

/** `--set` / `--add` / `--remove` values (names or ids) → label ids. All-UUID input makes no request at all. */
export async function resolveLabels(orgId: string, values: readonly string[], flag: string): Promise<string[]> {
	if (values.every(passesThrough)) return [...values];
	const labels = await listLabels(orgId);
	return values.map((value) => (passesThrough(value) ? value : matchByName(labels, value, LABEL, flag)));
}

/** A name that can stand in for `id` in an equivalent command: unambiguous, and not split by a `,` list. */
function nameOrId(items: readonly Named[], id: string): string {
	const item = items.find((candidate) => candidate.id === id);
	if (!item || item.name.includes(",")) return id;
	const sameName = items.filter((candidate) => candidate.name.toLowerCase() === item.name.toLowerCase());
	return sameName.length === 1 ? item.name : id;
}

/**
 * What a guided run prints after `--category` in its equivalent command: the category's name when that alone
 * identifies it (easier to read and to remember than an id), otherwise the id. Best-effort — if the lookup fails
 * the id is still a correct answer.
 */
export async function categoryForTip(orgId: string, id: string | undefined): Promise<string | undefined> {
	if (id === undefined) return undefined;
	try {
		return nameOrId(await listCategories(orgId), id);
	} catch {
		return id;
	}
}

/** Same as `categoryForTip`, for a comma-separated `--set` list of label ids. */
export async function labelsForTip(orgId: string, ids: readonly string[]): Promise<string> {
	try {
		const labels = await listLabels(orgId);
		return ids.map((id) => nameOrId(labels, id)).join(",");
	} catch {
		return ids.join(",");
	}
}
