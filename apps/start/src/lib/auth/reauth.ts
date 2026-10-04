// "Confirm it's you": Better Auth only allows some actions (adding a passkey, listing or revoking sessions) within a
// day of signing in (`session.freshAge`); after that it answers SESSION_NOT_FRESH. The fix is a fresh sign-in on the
// re-auth page (`routes/auth/reauth.tsx`), which then sends the user back to `redirect`.

export const SESSION_NOT_FRESH = "SESSION_NOT_FRESH";

/** A Better Auth client error's `code` (not every error shape carries one). */
export function authErrorCode(error: object | null | undefined): string | undefined {
	return error && "code" in error && typeof error.code === "string" ? error.code : undefined;
}

export function isSessionNotFresh(error: object | null | undefined): boolean {
	return authErrorCode(error) === SESSION_NOT_FRESH;
}

/** The re-auth page (on the main app host), returning to `returnTo` (an absolute URL) afterwards. */
export function reauthUrl(returnTo: string): string {
	return `${import.meta.env.VITE_URL_ROOT}/auth/reauth?redirect=${encodeURIComponent(returnTo)}`;
}

/** Only send people back to Sayr itself (the root domain or one of its subdomains), never an outside site. */
export function isSafeReturnUrl(value: string, rootDomain: string): boolean {
	try {
		const url = new URL(value);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		return url.hostname === rootDomain || url.hostname.endsWith(`.${rootDomain}`);
	} catch {
		return false;
	}
}
