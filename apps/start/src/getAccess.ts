import { auth } from "@repo/auth";
import type { schema } from "@repo/database";
import { redirect } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getSessionCookie } from "better-auth/cookies";

export const getAccess = async () => {
	const headers = getRequestHeaders();
	const h = new Headers(headers);
	const cookie = getSessionCookie(h) ?? "anon";

	if (!cookie || cookie === "anon") {
		console.log("🚀 ~ getAccess ~ cookie:", cookie);
		throw redirect({ to: "/home/login" });
	}

	try {
		// ✅ Use request.headers instead of headers()
		const session = await auth.api.getSession({
			headers: h,
		});

		if (session?.user) {
			return { account: session.user as schema.userType };
		}

		throw redirect({ to: "/home/login" });
	} catch (_error) {
		console.log("🚀 ~ getAccess ~ _error:", _error);
		throw redirect({ to: "/home/login" });
	}
};
