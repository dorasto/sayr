import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";

export type Theme = "light" | "dark";
const storageKey = "_preferred-theme";

// Cookie domains need at least 2 parts — bare "localhost" doesn't work
const rootDomain = process.env.VITE_ROOT_DOMAIN;
const isBarelocalhost = rootDomain === "localhost";

export const getThemeServerFn = createServerFn().handler(
	async () => (getCookie(storageKey) || "dark") as Theme,
);

export const setThemeServerFn = createServerFn({ method: "POST" })
	.inputValidator((data: Theme) => data)
	.handler(async ({ data }) =>
		setCookie(storageKey, data, {
			domain: isBarelocalhost ? undefined : `.${rootDomain}`,
			path: "/",
			maxAge: 60 * 60 * 24 * 365, // 1 year
			sameSite: "lax",
		}),
	);
