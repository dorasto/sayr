/**
 * Channel handling for the multi-org (`orgIds`) mode of the SSE subscribe endpoint
 * (see `sseRoute.get("/")` in ./index.ts). Pure — no I/O — so it can be exercised
 * without a server, a session or a database.
 *
 * A multi-org subscription joins one room per (org the caller is a member of ×
 * channel), so a client that needs several kinds of event from every org (the
 * cross-org board wants `tasks` and `releases`) does it over ONE connection
 * instead of one per channel.
 */

/** Rooms joined = member orgs × channels, so the list is capped. */
export const MAX_ORG_IDS_CHANNELS = 8;

const MAX_CHANNEL_NAME_LENGTH = 64;
/** Room names in use are `tasks`, `admin`, `releases`, `task:<id>`, `user`... — anything else in a LIST is refused. */
const LISTED_CHANNEL_NAME = /^[A-Za-z0-9:_-]+$/;

const CHANNEL_REQUIRED_ERROR = "A non-public channel is required for orgIds";

export type OrgIdsChannelParse = { ok: true; channels: [string, ...string[]] } | { ok: false; error: string };

/**
 * Reads the `channel` query param of an `orgIds` subscription.
 *
 *  - No comma: exactly the one channel the endpoint has always accepted, untouched (so
 *    every existing single-channel subscriber behaves identically). Empty and `public`
 *    are refused, as before.
 *  - Comma-separated (`tasks,releases`): trimmed, de-duplicated (first occurrence wins,
 *    order kept), each name validated. `public` is refused as for a single channel, and
 *    `system` (an API-key-only channel with its own room) can't be combined.
 *
 * `channels[0]` is the connection's PRIMARY channel — what `SSEClient.channel` holds. List
 * the one legacy code paths key off first: the task broadcasters decide whether to also
 * push an update to a connection individually by comparing its primary channel with
 * `"tasks"`, so a `tasks` client must list `tasks` first or it would receive task events twice.
 */
export function parseOrgIdsChannels(raw: string | undefined): OrgIdsChannelParse {
	if (!raw) return { ok: false, error: CHANNEL_REQUIRED_ERROR };

	if (!raw.includes(",")) {
		return raw === "public" ? { ok: false, error: CHANNEL_REQUIRED_ERROR } : { ok: true, channels: [raw] };
	}

	const names: string[] = [];
	for (const part of raw.split(",")) {
		const name = part.trim();
		if (name && !names.includes(name)) names.push(name);
	}

	const [primary, ...rest] = names;
	if (primary === undefined) return { ok: false, error: CHANNEL_REQUIRED_ERROR };
	if (names.includes("public")) return { ok: false, error: CHANNEL_REQUIRED_ERROR };
	if (names.includes("system")) return { ok: false, error: "The system channel cannot be combined with others" };
	if (names.length > MAX_ORG_IDS_CHANNELS) {
		return { ok: false, error: `At most ${MAX_ORG_IDS_CHANNELS} channels can be requested at once` };
	}
	if (names.some((name) => name.length > MAX_CHANNEL_NAME_LENGTH || !LISTED_CHANNEL_NAME.test(name))) {
		return { ok: false, error: "Invalid channel name" };
	}

	return { ok: true, channels: [primary, ...rest] };
}

/**
 * The `sseRooms` keys a connection joins: every channel in every org. `orgIds` must be the
 * orgs the caller was verified to be a member of — this only builds keys, it grants nothing.
 */
export function buildOrgRoomKeys(orgIds: readonly string[], channels: readonly string[]): string[] {
	return orgIds.flatMap((orgId) => channels.map((name) => `${orgId}:${name}`));
}
