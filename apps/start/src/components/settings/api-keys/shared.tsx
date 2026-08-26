import { Badge } from "@repo/ui/components/badge";
import { formatDate, isApiKeyScope, scopeDefinition } from "@repo/util";
import type { ApiKeyListItem } from "@/lib/fetches/apiKeys";

/** Bounds are set server-side; mirrored here only for display. */
export const MAX_NAME_LENGTH = 32;

export const EXPIRY_OPTIONS = [
	{ value: "never", label: "Never" },
	{ value: "30", label: "30 days" },
	{ value: "90", label: "90 days" },
	{ value: "365", label: "365 days" },
];

export const DEFAULT_EXPIRY = "90";

export function scopeLabel(scope: string) {
	return isApiKeyScope(scope) ? scopeDefinition(scope).label : scope;
}

export function formatMaybeDate(value: string | null, fallback: string) {
	return value ? formatDate(value) : fallback;
}

export function isExpired(apiKey: ApiKeyListItem) {
	return apiKey.expiresAt !== null && new Date(apiKey.expiresAt).getTime() <= Date.now();
}

export function StatusBadge({ apiKey }: { apiKey: ApiKeyListItem }) {
	if (isExpired(apiKey)) {
		return <Badge variant="destructive">Expired</Badge>;
	}
	if (!apiKey.enabled) {
		return <Badge variant="secondary">Disabled</Badge>;
	}
	return <Badge variant="default">Active</Badge>;
}

/**
 * Renders the per-key rate limit in human terms. The window is stored in ms and
 * is idle-reset rather than rolling, so this deliberately says "per" rather than
 * implying a sliding window.
 */
export function formatRateLimit(apiKey: ApiKeyListItem): string {
	if (apiKey.rateLimitMax === null || apiKey.rateLimitTimeWindow === null) {
		return "Unlimited";
	}

	const seconds = Math.round(apiKey.rateLimitTimeWindow / 1000);
	const unit =
		seconds % 86_400 === 0
			? `${seconds / 86_400 === 1 ? "day" : `${seconds / 86_400} days`}`
			: seconds % 3_600 === 0
				? `${seconds / 3_600 === 1 ? "hour" : `${seconds / 3_600} hours`}`
				: seconds % 60 === 0
					? `${seconds / 60 === 1 ? "minute" : `${seconds / 60} minutes`}`
					: `${seconds} seconds`;

	return `${apiKey.rateLimitMax.toLocaleString()} requests per ${unit}`;
}
