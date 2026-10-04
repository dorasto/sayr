import { useRouter } from "@tanstack/react-router";
import { useCallback } from "react";

/**
 * Builds the absolute, shareable URL of a post (or of the org's board when `shortId` is `null`) the way the router
 * resolves it for the current host, so it is right on a subdomain, a custom domain, a self-host or the system org.
 */
export function usePostPublicUrl() {
	const router = useRouter();
	return useCallback(
		(orgSlug: string, shortId: number | null): string => {
			const location =
				shortId === null
					? router.buildLocation({ to: "/orgs/$orgSlug", params: { orgSlug } })
					: router.buildLocation({ to: "/orgs/$orgSlug/$shortId", params: { orgSlug, shortId: String(shortId) } });
			return new URL(location.publicHref, window.location.href).toString();
		},
		[router]
	);
}
