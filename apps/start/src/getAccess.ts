import { auth } from "@repo/auth";
import type { schema } from "@repo/database";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getSessionCookie } from "better-auth/cookies";
import * as Sentry from "@sentry/tanstackstart-react";

export const getAccess = async () => {
	const headers = getRequestHeaders();
	const h = new Headers(headers);
	const cookie = getSessionCookie(h) ?? "anon";

	if (!cookie || cookie === "anon") {
		return { account: null };
	}

	try {
		// ✅ Use request.headers instead of headers()
		const session = await auth.api.getSession({
			headers: h,
		});

		if (session?.user) {
			// Set user context in Sentry for server-side error tracking
			if (process.env.VITE_SENTRY_DSN) {
				Sentry.setUser({
					id: session.user.id,
					email: session.user.email,
					username: session.user.name,
					...(session.user.role && { role: session.user.role }),
				});
			}

			return { account: session.user as schema.userType, sessionId: session.session.id };
		}

		// Clear Sentry user context if no session
		if (process.env.VITE_SENTRY_DSN) {
			Sentry.setUser(null);
		}

		return { account: null };
	} catch (_error) {
		// Clear Sentry user context on error
		if (process.env.VITE_SENTRY_DSN) {
			Sentry.setUser(null);
		}
		return { account: null };
	}
};
