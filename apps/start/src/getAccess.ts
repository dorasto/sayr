import { auth } from "@repo/auth";
import type { schema } from "@repo/database";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getSessionCookie } from "better-auth/cookies";

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
			console.log("🚀 ~ getAccess ~ session:", session);
			return { account: session.user as schema.userType };
		}

		return { account: null };
	} catch (_error) {
		console.log("🚀 ~ getAccess ~ _error:", _error);
		return { account: null };
	}
};
