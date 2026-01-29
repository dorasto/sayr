import { authClient } from "@repo/auth/client";
import * as Sentry from "@sentry/tanstackstart-react";
import { useEffect } from "react";

/**
 * SentryUserSync component
 *
 * Automatically syncs authenticated user data to Sentry for better error tracking.
 * Sets user context including id, email, name, and role for all Sentry events.
 */
export function SentryUserSync() {
	const { data: session } = authClient.useSession();

	useEffect(() => {
		if (import.meta.env.VITE_SENTRY_DSN) {
			if (session?.user) {
				// Set user context in Sentry
				Sentry.setUser({
					id: session.user.id,
					email: session.user.email,
					username: session.user.name,
					// Add role if available for better filtering
					...(session.user.role && { role: session.user.role }),
				});
			} else {
				// Clear user context when logged out
				Sentry.setUser(null);
			}
		}
	}, [session]);

	// This component doesn't render anything
	return null;
}

/**
 * SentryOrgContext component
 *
 * Sets organization context in Sentry for better issue filtering and debugging.
 * Use this in organization-specific layouts to add org data to all errors.
 *
 * @param orgId - Organization ID
 * @param orgName - Organization name (optional)
 * @param orgSlug - Organization slug (optional)
 */
export function SentryOrgContext({
	orgId,
	orgName,
	orgSlug,
}: {
	orgId: string;
	orgName?: string;
	orgSlug?: string;
}) {
	useEffect(() => {
		if (import.meta.env.VITE_SENTRY_DSN) {
			// Set organization context for filtering and debugging
			Sentry.setContext("organization", {
				id: orgId,
				...(orgName && { name: orgName }),
				...(orgSlug && { slug: orgSlug }),
			});
		}

		// Clear org context on unmount
		return () => {
			if (import.meta.env.VITE_SENTRY_DSN) {
				Sentry.setContext("organization", null);
			}
		};
	}, [orgId, orgName, orgSlug]);

	return null;
}
