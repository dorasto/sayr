/**
 * Channel values for the SSE subscription (hooks/useServerEventsSubscription.ts, lib/serverEvents.ts).
 * Pure, so it is unit-testable without a browser.
 *
 * A subscription names one channel (`"tasks"`) or several (`["tasks", "releases"]`). Several are only
 * honoured for a multi-org `orgIds` subscription (see apps/backend/routes/events/channels.ts). On the
 * wire, and in the shared "sse-subscribe-state" entry, a subscription's channel is always ONE string:
 * the plain name for a single channel — exactly what single-channel callers have always produced — or the
 * names comma-joined for several, with the PRIMARY channel first (the backend treats the first as the
 * connection's own channel, so a subscriber that also wants `tasks` events lists `tasks` first).
 */
export type ChannelValue = string | readonly string[] | null | undefined;

/** The channel as one string (what is sent as the `channel` query param and stored), or null for none. */
export function joinChannels(channel: ChannelValue): string | null {
	if (channel === null || channel === undefined) return null;
	if (typeof channel === "string") return channel;

	const names = [...new Set(channel.filter((name) => name.length > 0))];
	return names.length > 0 ? names.join(",") : null;
}

/** Whether two channel values name the same SET of channels — order doesn't matter, only membership. */
export function sameChannels(a: ChannelValue, b: ChannelValue): boolean {
	return channelSetKey(a) === channelSetKey(b);
}

function channelSetKey(channel: ChannelValue): string | null {
	const joined = joinChannels(channel);
	return joined === null ? null : joined.split(",").sort().join(",");
}
