import type { OrganizationMembersLike } from "./team";

/** `hsla(0, 0%, 0%, 1)` is the schema default for a release colour, i.e. "never picked one". */
const DEFAULT_RELEASE_COLOR = /^hsla?\(\s*0(?:deg)?\s*,\s*0%\s*,\s*0%\s*(?:,\s*1(?:\.0+)?\s*)?\)$/i;

/** The colour a release was given, or `null` when it is missing or still the black default (use the accent instead). */
export function getReleaseTint(color: string | null | undefined): string | null {
	if (!color) return null;
	const trimmed = color.trim();
	if (!trimmed || DEFAULT_RELEASE_COLOR.test(trimmed)) return null;
	return trimmed;
}

export type ReleaseHealth = "on_track" | "at_risk" | "off_track";

const HEALTH: Record<ReleaseHealth, { label: string; tone: "ok" | "accent" | "bad" }> = {
	on_track: { label: "On track", tone: "ok" },
	at_risk: { label: "At risk", tone: "accent" },
	off_track: { label: "Off track", tone: "bad" },
};

/** Label and tone for a status update's health, or `null` when it is absent or unknown (the pill is omitted). */
export function getHealthPill(
	health: string | null | undefined
): { label: string; tone: "ok" | "accent" | "bad" } | null {
	if (!health) return null;
	return HEALTH[health as ReleaseHealth] ?? null;
}

interface OrderableTask {
	status: string;
	shortId?: number | null;
}

// "What is in it" order for an unreleased release: in progress, planned (todo, then backlog), then done.
const OPEN_RANK: Record<string, number> = { "in-progress": 0, todo: 1, backlog: 2, done: 3 };

/**
 * Tasks for "What is in it": in progress, planned, then done — reversed (done first) once the release has shipped.
 * Won't do (`canceled`) tasks are not part of the release and are dropped. Ties keep the lowest short id first.
 */
export function orderReleaseTasks<T extends OrderableTask>(tasks: ReadonlyArray<T>, releaseStatus: string): T[] {
	const reverse = releaseStatus === "released";
	const rank = (task: T) => OPEN_RANK[task.status] ?? OPEN_RANK.backlog ?? 2;

	return tasks
		.filter((task) => task.status !== "canceled")
		.sort((a, b) => {
			const byRank = reverse ? rank(b) - rank(a) : rank(a) - rank(b);
			return byRank || (a.shortId ?? 0) - (b.shortId ?? 0);
		});
}

/**
 * How many of a release's tasks were posted by someone outside the team. Only counts tasks with a known creator
 * (GitHub-synced or deleted-account tasks have none), and returns `null` when the team cannot be resolved at all so
 * the caller omits the row instead of reporting every post as a user post.
 */
export function countUserPosts(
	tasks: ReadonlyArray<{ createdBy?: string | null }>,
	organization: OrganizationMembersLike
): number | null {
	if (organization.members.length === 0) return null;
	const teamIds = new Set(organization.members.map((member) => member.user.id));
	return tasks.filter((task) => !!task.createdBy && !teamIds.has(task.createdBy)).length;
}

export interface DocNode {
	type?: string;
	text?: string;
	content?: unknown[];
}

function nodeText(node: unknown): string {
	if (!node || typeof node !== "object") return "";
	const n = node as DocNode;
	if (n.type === "text" && typeof n.text === "string") return n.text;
	if (Array.isArray(n.content)) return n.content.map(nodeText).join("");
	return "";
}

function topLevelBlocks(doc: unknown): unknown[] {
	if (!doc || typeof doc !== "object") return [];
	const d = doc as DocNode;
	return d.type === "doc" && Array.isArray(d.content) ? d.content : [];
}

function isBlankParagraph(block: unknown): boolean {
	return (block as DocNode).type === "paragraph" && nodeText(block).trim() === "";
}

/** Top-level blocks minus leading blank paragraphs. */
function contentBlocks(doc: unknown): unknown[] {
	const blocks = topLevelBlocks(doc);
	const first = blocks.findIndex((block) => !isBlankParagraph(block));
	return first === -1 ? [] : blocks.slice(first);
}

/**
 * The release page lede: the text of the description's opening paragraph. A description that opens with anything
 * else (a heading, a list) has no lede.
 */
export function getFirstParagraphText(doc: unknown): string {
	const [first] = contentBlocks(doc);
	return first && (first as DocNode).type === "paragraph" ? nodeText(first).trim() : "";
}

/**
 * The description with the lede paragraph (and any leading blank paragraphs) taken out, for rendering the rest as
 * release notes. `null` when nothing is left, so a lede-only description does not render the same text twice.
 */
export function getNotesAfterLede<T extends DocNode>(doc: T | null | undefined): T | null {
	if (!doc) return null;
	const blocks = contentBlocks(doc);
	const first = blocks[0] as DocNode | undefined;
	const rest = first?.type === "paragraph" ? blocks.slice(1) : blocks;
	return rest.length > 0 ? { ...doc, content: rest } : null;
}
