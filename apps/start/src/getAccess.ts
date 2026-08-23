import { auth, getSessionCookie } from "@repo/auth";
import type { schema } from "@repo/database";
import { getRequestHeaders } from "@tanstack/react-start/server";

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
			return { account: session.user as schema.userType, sessionId: session.session.id };
		}

		return { account: null };
	} catch (_error) {
		return { account: null };
	}
};
