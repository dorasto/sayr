import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { inferAdditionalFields, lastLoginMethodClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react"; // make sure to import from better-auth/react
import type { auth } from "./index";
export const authClient = createAuthClient({
	plugins: [
		inferAdditionalFields<typeof auth>(),
		lastLoginMethodClient(),
		twoFactorClient({
			onTwoFactorRedirect() {
				window.location.href = "/auth/2fa";
			},
		}),
		passkeyClient(),
		// Powers the MCP consent page (SAY-31) — approve/deny calls go through this.
		oauthProviderClient(),
	],
});
/** Tells /auth/auth-check where to finish: `returnTo` (an absolute URL) when given, otherwise back on this origin. */
const setLoginOriginCookie = (returnTo?: string) => {
	const target = returnTo ? new URL(returnTo) : null;
	const origin = target?.origin ?? window.location.origin;
	const hostname = window.location.hostname;
	const domain = hostname === "localhost" ? undefined : hostname.split(".").slice(-2).join(".");
	const cookieParts = [
		`login_origin=${encodeURIComponent(origin)}`,
		"path=/",
		"max-age=500", // 5 minutes
		"samesite=lax",
	];
	if (domain) {
		cookieParts.push(`domain=.${domain}`);
	}
	document.cookie = cookieParts.join("; ");
	if (target) {
		const path = `${target.pathname}${target.search}${target.hash}`;
		document.cookie = `post_login_redirect=${encodeURIComponent(path)}; path=/; max-age=500; samesite=lax`;
	} else {
		// An abandoned sign-in may have left one behind. Redirects set by the server are HttpOnly, so this can't clear them.
		document.cookie = "post_login_redirect=; path=/; max-age=0; samesite=lax";
	}
};

export const signInEmailTwoFactor = async (returnTo?: string) => {
	// Before any await: the twoFactor plugin's redirect to /auth/2fa is already under way.
	setLoginOriginCookie(returnTo);
	const found = await authClient.getSession();
	if (found.data) {
		window.location.href = returnTo ?? "/";
		return;
	}
	window.location.href = "/auth/2fa";
};

export const signInEmail = async (returnTo?: string) => {
	const found = await authClient.getSession();
	if (found.data) {
		window.location.href = returnTo ?? "/";
		return;
	}
	setLoginOriginCookie(returnTo);
	window.location.href = "/auth/auth-check";
};

const signInSocial = async (provider: "doras" | "github" | "discord" | "slack", returnTo?: string) => {
	const found = await authClient.getSession();
	if (found.data) {
		window.location.href = returnTo ?? "/";
		return;
	}
	if (!returnTo) setLoginOriginCookie();
	await authClient.signIn.social({
		provider,
		callbackURL: returnTo ?? "/auth/auth-check",
	});
};

export const signInDoras = (returnTo?: string) => signInSocial("doras", returnTo);
export const signInGithub = (returnTo?: string) => signInSocial("github", returnTo);
export const signInDiscord = (returnTo?: string) => signInSocial("discord", returnTo);
export const signInSlack = (returnTo?: string) => signInSocial("slack", returnTo);
