import { type ReleaseStatus, schema } from "@repo/database";
import { generateSlug, hexToHsla } from "@repo/util";
import { markdownToProsekitJSON } from "@/prosekit/parser";
import { looksLikeUuid } from "../apiRefs";

/**
 * Request-body parsing for the `/v1/me` release routes, in the same
 * `Validated<T>` style as `routes/api/internal/v1/apikey.ts`: each parser
 * returns `{ ok: true, value }` or `{ ok: false, error }`, and the route turns
 * the error into a 400. Nothing here touches the database — checks that need
 * it (slug uniqueness, lead membership, ownership of referenced rows) live in
 * the services and routes.
 *
 * Text fields that hold rich content (`description`, status update and comment
 * `content`) are accepted as Markdown and converted to the editor's JSON here.
 */
export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

export const RELEASE_STATUSES = schema.releaseStatusEnum.enumValues;
export const RELEASE_HEALTHS = schema.releaseUpdateHealthEnum.enumValues;
export const RELEASE_VISIBILITIES = schema.releaseUpdateVisibilityEnum.enumValues;

type ReleaseHealth = (typeof RELEASE_HEALTHS)[number];
type ReleaseVisibility = (typeof RELEASE_VISIBILITIES)[number];

/** Same defaults the web app's create-release dialog uses. */
export const DEFAULT_RELEASE_COLOR = "hsla(217, 91%, 60%, 1)";
export const DEFAULT_RELEASE_ICON = "IconRocket";

const MAX_NAME_LENGTH = 200;
const MAX_SLUG_LENGTH = 100;
const MAX_ICON_LENGTH = 64;
const SLUG_PATTERN = /^[a-z0-9._-]+$/;
const SLUG_ALPHANUMERIC = /[a-z0-9]/;
const ICON_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/;
// `YYYY-MM-DD`, or a full timestamp: `YYYY-MM-DDTHH:mm[:ss[.fff]]` with an optional `Z` / `+HH:mm` offset.
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/i;
// Dates are stored as Postgres timestamps and serialized as ISO strings; outside this range the
// serialized form (or the column) can't represent them.
const MIN_DATE_YEAR = 1900;
const MAX_DATE_YEAR = 9999;
const HSLA_PATTERN =
	/^hsla?\(\s*(\d{1,3}(?:\.\d+)?)\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*(?:,\s*(\d(?:\.\d+)?|\.\d+)\s*)?\)$/i;

function isOneOf<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
	return typeof value === "string" && (values as readonly string[]).includes(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Narrows a parsed request body to a JSON object; arrays, strings, numbers, and null give `null`. */
export function asBodyObject(body: unknown): Record<string, unknown> | null {
	return isPlainObject(body) ? body : null;
}

function validateName(raw: unknown): Validated<string> {
	if (typeof raw !== "string" || raw.trim().length === 0) {
		return { ok: false, error: "A non-empty name is required." };
	}
	const trimmed = raw.trim();
	if (trimmed.length > MAX_NAME_LENGTH) {
		return { ok: false, error: `The name must be ${MAX_NAME_LENGTH} characters or fewer.` };
	}
	return { ok: true, value: trimmed };
}

function validateSlug(raw: unknown): Validated<string> {
	if (typeof raw !== "string") {
		return { ok: false, error: "The slug must be a string." };
	}
	const slug = raw.trim();
	if (!slug || slug.length > MAX_SLUG_LENGTH || !SLUG_PATTERN.test(slug)) {
		return {
			ok: false,
			error: `The slug must be 1-${MAX_SLUG_LENGTH} characters of lowercase letters, numbers, ".", "_" or "-".`,
		};
	}
	// Punctuation alone (".", "..", "-") isn't a usable slug: it can't be told apart from a path segment in a URL.
	if (!SLUG_ALPHANUMERIC.test(slug)) {
		return { ok: false, error: 'The slug must contain at least one letter or number, not just ".", "_" or "-".' };
	}
	// A UUID-shaped slug would be ambiguous with a release id when resolving a reference.
	if (looksLikeUuid(slug)) {
		return { ok: false, error: "The slug can't look like an id (UUID)." };
	}
	return { ok: true, value: slug };
}

function validateStatus(raw: unknown): Validated<ReleaseStatus> {
	if (!isOneOf(RELEASE_STATUSES, raw)) {
		return { ok: false, error: `The status must be one of: ${RELEASE_STATUSES.join(", ")}.` };
	}
	return { ok: true, value: raw };
}

function validateDate(raw: unknown, field: string): Validated<Date> {
	const text = typeof raw === "string" ? raw.trim() : "";
	const match = DATE_PATTERN.exec(text);
	if (!match) {
		return {
			ok: false,
			error: `"${field}" must be an ISO date (e.g. 2026-10-01) or a full ISO timestamp (e.g. 2026-10-01T09:00:00Z).`,
		};
	}

	const outOfRange = {
		ok: false,
		error: `"${field}" must be in a year between ${MIN_DATE_YEAR} and ${MAX_DATE_YEAR}.`,
	} as const;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (year < MIN_DATE_YEAR || year > MAX_DATE_YEAR) return outOfRange;

	// `Date` rolls an impossible day (2026-02-31) over into the next month rather than rejecting it,
	// so check the calendar date on its own. (Month first: the day count is only looked up for a real month.)
	if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) {
		return { ok: false, error: `"${field}" isn't a real calendar date.` };
	}

	const date = new Date(text);
	if (Number.isNaN(date.getTime())) {
		return { ok: false, error: `"${field}" isn't a valid date.` };
	}
	// A timezone offset can carry a date at the edge of the range across it.
	const utcYear = date.getUTCFullYear();
	if (utcYear < MIN_DATE_YEAR || utcYear > MAX_DATE_YEAR) return outOfRange;

	return { ok: true, value: date };
}

/**
 * Accepts `#RRGGBB` (also `#RGB`, `#` optional) or an `hsla(...)`/`hsl(...)`
 * string, and returns the `hsla(h, s%, l%, a)` form the app stores. Anything
 * else is rejected — the value is rendered into inline styles on public pages,
 * so it is never stored as free text.
 */
function validateColor(raw: unknown): Validated<string> {
	const invalid = {
		ok: false,
		error: 'The color must be a #RRGGBB hex value or an "hsla(h, s%, l%, a)" string.',
	} as const;
	if (typeof raw !== "string") return invalid;

	const trimmed = raw.trim();
	const fromHex = hexToHsla(trimmed);
	if (fromHex) return { ok: true, value: fromHex };

	const match = HSLA_PATTERN.exec(trimmed);
	if (!match) return invalid;

	const [, h, s, l, a] = match;
	const hue = Number(h);
	const saturation = Number(s);
	const lightness = Number(l);
	const alpha = a === undefined ? 1 : Number(a);
	if (hue > 360 || saturation > 100 || lightness > 100 || alpha > 1) return invalid;

	return { ok: true, value: `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})` };
}

function validateIcon(raw: unknown): Validated<string> {
	if (
		typeof raw !== "string" ||
		!raw.trim() ||
		raw.trim().length > MAX_ICON_LENGTH ||
		!ICON_PATTERN.test(raw.trim())
	) {
		return { ok: false, error: 'The icon must be an icon name such as "IconRocket".' };
	}
	return { ok: true, value: raw.trim() };
}

function validateMarkdown(raw: unknown, field: string, options: { allowEmpty: boolean }): Validated<schema.NodeJSON> {
	if (typeof raw !== "string") {
		return { ok: false, error: `"${field}" must be a Markdown string.` };
	}
	if (!options.allowEmpty && raw.trim().length === 0) {
		return { ok: false, error: `"${field}" can't be empty.` };
	}
	return { ok: true, value: markdownToProsekitJSON(raw) };
}

function validateOptionalId(raw: unknown, field: string): Validated<string | undefined> {
	if (raw === undefined || raw === null) return { ok: true, value: undefined };
	if (typeof raw !== "string" || !raw.trim()) {
		return { ok: false, error: `"${field}" must be an id string.` };
	}
	return { ok: true, value: raw.trim() };
}

/* -------------------------------------------------------------------------- */
/*                                  Releases                                  */
/* -------------------------------------------------------------------------- */

/** The optional `?status=` filter on the list route: absent or empty means every status. */
export function parseStatusFilter(raw: string | undefined): Validated<ReleaseStatus | undefined> {
	if (raw === undefined || raw === "") return { ok: true, value: undefined };
	return validateStatus(raw);
}

export interface CreateReleaseInput {
	name: string;
	slug: string;
	description?: schema.NodeJSON;
	status: ReleaseStatus;
	targetDate?: Date;
	releasedAt?: Date;
	color: string;
	icon: string;
}

export function parseCreateReleaseInput(body: Record<string, unknown>): Validated<CreateReleaseInput> {
	const name = validateName(body.name);
	if (!name.ok) return name;

	// No slug given: derive one from the name, exactly as a caller would by hand.
	const rawSlug =
		body.slug === undefined || body.slug === null || body.slug === "" ? generateSlug(name.value) : body.slug;
	if (rawSlug === "") {
		return { ok: false, error: "Couldn't derive a slug from the name. Pass a slug." };
	}
	const slug = validateSlug(rawSlug);
	if (!slug.ok) return slug;

	let status: ReleaseStatus = "planned";
	if (body.status !== undefined) {
		const parsed = validateStatus(body.status);
		if (!parsed.ok) return parsed;
		status = parsed.value;
	}

	let description: schema.NodeJSON | undefined;
	if (body.description !== undefined) {
		const parsed = validateMarkdown(body.description, "description", { allowEmpty: true });
		if (!parsed.ok) return parsed;
		description = parsed.value;
	}

	let targetDate: Date | undefined;
	if (body.targetDate !== undefined && body.targetDate !== null) {
		const parsed = validateDate(body.targetDate, "targetDate");
		if (!parsed.ok) return parsed;
		targetDate = parsed.value;
	}

	let releasedAt: Date | undefined;
	if (body.releasedAt !== undefined && body.releasedAt !== null) {
		const parsed = validateDate(body.releasedAt, "releasedAt");
		if (!parsed.ok) return parsed;
		releasedAt = parsed.value;
	}

	let color = DEFAULT_RELEASE_COLOR;
	if (body.color !== undefined) {
		const parsed = validateColor(body.color);
		if (!parsed.ok) return parsed;
		color = parsed.value;
	}

	let icon = DEFAULT_RELEASE_ICON;
	if (body.icon !== undefined) {
		const parsed = validateIcon(body.icon);
		if (!parsed.ok) return parsed;
		icon = parsed.value;
	}

	return {
		ok: true,
		value: { name: name.value, slug: slug.value, description, status, targetDate, releasedAt, color, icon },
	};
}

export interface UpdateReleaseInput {
	name?: string;
	slug?: string;
	description?: schema.NodeJSON;
	status?: ReleaseStatus;
	/** `null` clears the date. */
	targetDate?: Date | null;
	/** `null` clears the date. */
	releasedAt?: Date | null;
	color?: string;
	icon?: string;
	/** `null` clears the lead. Membership of the organization is checked by the service. */
	leadId?: string | null;
}

/** Only the fields present in `body` are set; at least one is required. */
export function parseUpdateReleaseInput(body: Record<string, unknown>): Validated<UpdateReleaseInput> {
	const value: UpdateReleaseInput = {};

	if (body.name !== undefined) {
		const parsed = validateName(body.name);
		if (!parsed.ok) return parsed;
		value.name = parsed.value;
	}

	if (body.slug !== undefined) {
		const parsed = validateSlug(body.slug);
		if (!parsed.ok) return parsed;
		value.slug = parsed.value;
	}

	if (body.description !== undefined) {
		const parsed = validateMarkdown(body.description, "description", { allowEmpty: true });
		if (!parsed.ok) return parsed;
		value.description = parsed.value;
	}

	if (body.status !== undefined) {
		const parsed = validateStatus(body.status);
		if (!parsed.ok) return parsed;
		value.status = parsed.value;
	}

	if (body.targetDate !== undefined) {
		if (body.targetDate === null) {
			value.targetDate = null;
		} else {
			const parsed = validateDate(body.targetDate, "targetDate");
			if (!parsed.ok) return parsed;
			value.targetDate = parsed.value;
		}
	}

	if (body.releasedAt !== undefined) {
		if (body.releasedAt === null) {
			value.releasedAt = null;
		} else {
			const parsed = validateDate(body.releasedAt, "releasedAt");
			if (!parsed.ok) return parsed;
			value.releasedAt = parsed.value;
		}
	}

	if (body.color !== undefined) {
		const parsed = validateColor(body.color);
		if (!parsed.ok) return parsed;
		value.color = parsed.value;
	}

	if (body.icon !== undefined) {
		const parsed = validateIcon(body.icon);
		if (!parsed.ok) return parsed;
		value.icon = parsed.value;
	}

	if (body.leadId !== undefined) {
		if (body.leadId === null) {
			value.leadId = null;
		} else if (typeof body.leadId === "string" && body.leadId.trim()) {
			value.leadId = body.leadId.trim();
		} else {
			return { ok: false, error: '"leadId" must be a user id, or null to clear the lead.' };
		}
	}

	if (Object.keys(value).length === 0) {
		return { ok: false, error: "Nothing to update. Pass at least one field to change." };
	}

	return { ok: true, value };
}

/* -------------------------------------------------------------------------- */
/*                               Status updates                               */
/* -------------------------------------------------------------------------- */

export interface CreateStatusUpdateInput {
	content?: schema.NodeJSON;
	health: ReleaseHealth;
	visibility: ReleaseVisibility;
}

export function parseCreateStatusUpdateInput(body: Record<string, unknown>): Validated<CreateStatusUpdateInput> {
	let content: schema.NodeJSON | undefined;
	if (body.content !== undefined) {
		const parsed = validateMarkdown(body.content, "content", { allowEmpty: true });
		if (!parsed.ok) return parsed;
		content = parsed.value;
	}

	let health: ReleaseHealth = "on_track";
	if (body.health !== undefined) {
		if (!isOneOf(RELEASE_HEALTHS, body.health)) {
			return { ok: false, error: `The health must be one of: ${RELEASE_HEALTHS.join(", ")}.` };
		}
		health = body.health;
	}

	let visibility: ReleaseVisibility = "public";
	if (body.visibility !== undefined) {
		if (!isOneOf(RELEASE_VISIBILITIES, body.visibility)) {
			return { ok: false, error: `The visibility must be one of: ${RELEASE_VISIBILITIES.join(", ")}.` };
		}
		visibility = body.visibility;
	}

	return { ok: true, value: { content, health, visibility } };
}

export type UpdateStatusUpdateInput = Partial<CreateStatusUpdateInput>;

/** Only the fields present in `body` are set; at least one is required. */
export function parseUpdateStatusUpdateInput(body: Record<string, unknown>): Validated<UpdateStatusUpdateInput> {
	const value: UpdateStatusUpdateInput = {};

	if (body.content !== undefined) {
		const parsed = validateMarkdown(body.content, "content", { allowEmpty: true });
		if (!parsed.ok) return parsed;
		value.content = parsed.value;
	}

	if (body.health !== undefined) {
		if (!isOneOf(RELEASE_HEALTHS, body.health)) {
			return { ok: false, error: `The health must be one of: ${RELEASE_HEALTHS.join(", ")}.` };
		}
		value.health = body.health;
	}

	if (body.visibility !== undefined) {
		if (!isOneOf(RELEASE_VISIBILITIES, body.visibility)) {
			return { ok: false, error: `The visibility must be one of: ${RELEASE_VISIBILITIES.join(", ")}.` };
		}
		value.visibility = body.visibility;
	}

	if (Object.keys(value).length === 0) {
		return { ok: false, error: "Nothing to update. Pass at least one field to change." };
	}

	return { ok: true, value };
}

/* -------------------------------------------------------------------------- */
/*                                  Comments                                  */
/* -------------------------------------------------------------------------- */

export interface CreateCommentInput {
	content: schema.NodeJSON;
	visibility: ReleaseVisibility;
	statusUpdateId?: string;
	parentId?: string;
}

export function parseCreateCommentInput(body: Record<string, unknown>): Validated<CreateCommentInput> {
	const content = validateMarkdown(body.content, "content", { allowEmpty: false });
	if (!content.ok) return content;

	let visibility: ReleaseVisibility = "public";
	if (body.visibility !== undefined) {
		if (!isOneOf(RELEASE_VISIBILITIES, body.visibility)) {
			return { ok: false, error: `The visibility must be one of: ${RELEASE_VISIBILITIES.join(", ")}.` };
		}
		visibility = body.visibility;
	}

	const statusUpdateId = validateOptionalId(body.statusUpdateId, "statusUpdateId");
	if (!statusUpdateId.ok) return statusUpdateId;

	const parentId = validateOptionalId(body.parentId, "parentId");
	if (!parentId.ok) return parentId;

	return {
		ok: true,
		value: { content: content.value, visibility, statusUpdateId: statusUpdateId.value, parentId: parentId.value },
	};
}

export interface UpdateCommentInput {
	content?: schema.NodeJSON;
	visibility?: ReleaseVisibility;
}

/** Only the fields present in `body` are set; at least one is required. */
export function parseUpdateCommentInput(body: Record<string, unknown>): Validated<UpdateCommentInput> {
	const value: UpdateCommentInput = {};

	if (body.content !== undefined) {
		const parsed = validateMarkdown(body.content, "content", { allowEmpty: false });
		if (!parsed.ok) return parsed;
		value.content = parsed.value;
	}

	if (body.visibility !== undefined) {
		if (!isOneOf(RELEASE_VISIBILITIES, body.visibility)) {
			return { ok: false, error: `The visibility must be one of: ${RELEASE_VISIBILITIES.join(", ")}.` };
		}
		value.visibility = body.visibility;
	}

	if (Object.keys(value).length === 0) {
		return { ok: false, error: "Nothing to update. Pass at least one field to change." };
	}

	return { ok: true, value };
}
