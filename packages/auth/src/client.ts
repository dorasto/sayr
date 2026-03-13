import { genericOAuthClient, inferAdditionalFields } from "better-auth/client/plugins";
import { polarClient } from "@polar-sh/better-auth/client";
import { createAuthClient } from "better-auth/react"; // make sure to import from better-auth/react
import type { auth } from "./index";
export const authClient = createAuthClient({
	plugins: [inferAdditionalFields<typeof auth>(), genericOAuthClient(), polarClient()],
});
const setLoginOriginCookie = () => {
	const origin = window.location.origin;
	const hostname = window.location.hostname;
	const domain = hostname === "localhost" ? undefined : hostname.split(".").slice(-2).join(".");
	const cookieParts = [
		"login_origin=" + encodeURIComponent(origin),
		"path=/",
		"max-age=500", // 5 minutes
		"samesite=lax",
	];
	if (domain) {
		cookieParts.push(`domain=.${domain}`);
	}
	document.cookie = cookieParts.join("; ");
};

export const signInEmail = async () => {
	const found = await authClient.getSession();
	if (found.data) {
		window.location.href = "/";
		return;
	}
	setLoginOriginCookie();
	window.location.href = "/auth/auth-check"
}

export const signInDoras = async () => {
	const found = await authClient.getSession();
	if (found.data) {
		window.location.href = "/";
		return;
	}
	setLoginOriginCookie();
	await authClient.signIn.oauth2({
		providerId: "doras",
		callbackURL: `/auth/auth-check`,
	});
};

export const singInGithub = async () => {
	const found = await authClient.getSession();
	if (found.data) {
		window.location.href = "/";
		return;
	}
	setLoginOriginCookie();
	await authClient.signIn.social({
		provider: "github",
		callbackURL: `/auth/auth-check`,
	});
};
