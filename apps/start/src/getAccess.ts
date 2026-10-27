import { auth, getSessionCookie } from "@repo/auth";
import { isOrganizationMember, type schema } from "@repo/database";
import { redirect } from "@tanstack/react-router";
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

/**
 * Server-only: resolves the authenticated user from the request's session cookie, or throws a
 * redirect to the login page. Use this inside every `createServerFn` handler that reads or
 * writes user/org-scoped data — server functions are publicly callable over HTTP, so identity
 * must come from the session, never from client-supplied input (`account`, `accountId`, ...).
 */
export const requireAccount = async (): Promise<schema.userType> => {
	const { account } = await getAccess();
	if (!account) {
		throw redirect({ to: "/auth/login" });
	}
	return account;
};

/**
 * Server-only: like {@link requireAccount}, but also requires the session user to be a member of
 * `orgId`. Non-members are sent to "/" (the same place the org settings layout sends them).
 */
export const requireOrgMember = async (orgId: string): Promise<schema.userType> => {
	const account = await requireAccount();
	if (!orgId || !(await isOrganizationMember(orgId, account.id))) {
		throw redirect({ to: "/" });
	}
	return account;
};
