import type { schema } from "@repo/database";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

export const getAccess = createServerFn({ method: "GET" }).handler(async () => {
	// Dynamic imports to ensure server-only modules don't leak to client bundle
	const { getRequestHeaders } = await import("@tanstack/react-start/server");
	const { auth } = await import("@repo/auth");
	const { getSessionCookie } = await import("better-auth/cookies");

	const headers = getRequestHeaders();
	const h = new Headers(headers);
	const cookie = getSessionCookie(h);

	if (!cookie) {
		throw redirect({ to: "/home/login" });
	}

	try {
		const session = await auth.api.getSession({ headers: h });
		if (session?.user) {
			// Normalize user data to match schema.userType
			const account: schema.userType = {
				id: session.user.id,
				name: session.user.name,
				email: session.user.email,
				emailVerified: session.user.emailVerified,
				image: session.user.image ?? null,
				createdAt: session.user.createdAt,
				updatedAt: session.user.updatedAt,
				role: session.user.role ?? null,
				banned: session.user.banned ?? null,
				banReason: session.user.banReason ?? null,
				banExpires: session.user.banExpires ?? null,
			};
			return { account };
		}
		throw redirect({ to: "/home/login" });
	} catch (error) {
		// If it's already a redirect, re-throw it
		if (error && typeof error === "object" && "redirect" in error) {
			throw error;
		}
		throw redirect({ to: "/home/login" });
	}
});
