import { createFileRoute } from "@tanstack/react-router";

function getCookie(request: Request, name: string): string | undefined {
	const cookie = request.headers.get("cookie");
	if (!cookie) return undefined;

	return cookie
		.split("; ")
		.find((row) => row.startsWith(`${name}=`))
		?.split("=")
		.slice(1)
		.join("=");
}
function getCookieDomain(url: string) {
	try {
		const { hostname } = new URL(url);
		if (hostname === "localhost") return undefined;
		return hostname.split(".").slice(-2).join(".");
	} catch {
		return undefined;
	}
}
export const Route = createFileRoute("/auth/auth-check")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const originRaw = getCookie(request, "login_origin");
				const redirectRaw = getCookie(request, "post_login_redirect");

				let origin: string | undefined;
				let redirectPath = "/";

				if (originRaw) {
					try {
						origin = decodeURIComponent(originRaw);
					} catch { }
				}

				if (redirectRaw) {
					try {
						const decoded = decodeURIComponent(redirectRaw);
						if (decoded.startsWith("/")) {
							redirectPath = decoded;
						}
					} catch { }
				}

				const location = origin
					? `${origin}${redirectPath}`
					: redirectPath;

				const headers = new Headers();
				headers.set("Location", location);
				const domain = originRaw ? getCookieDomain(decodeURIComponent(originRaw)) : undefined;

				headers.append(
					"Set-Cookie",
					`login_origin=; Path=/; Max-Age=0; SameSite=Lax; domain=.${domain}`
				)

				headers.append(
					"Set-Cookie",
					"post_login_redirect=; Path=/; Max-Age=0; SameSite=Lax"
				)

				return new Response(null, {
					status: 302,
					headers,
				})
			},
		},
	},
});