import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		"/((?!api|_next/static|_next/image|favicon.ico).*)",
	],
};

export default function middleware(req: NextRequest) {
	const url = req.nextUrl;
	const path = url.pathname;
	const search = url.search;
	const hostname = req.headers.get("host") || "";
	const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "";

	console.log("🚀 Middleware - hostname:", hostname);
	console.log("🚀 Middleware - rootDomain:", rootDomain);
	console.log("🚀 Middleware - path:", path);

	// Root domain logic
	if (hostname === rootDomain) {
		console.log("🏠 Root domain request");

		if (path === "/login") {
			console.log("🔀 Rewriting to /login");
			return NextResponse.rewrite(new URL(`/login${search}`, req.url));
		}

		if (path.startsWith("/auth")) {
			console.log("🔀 Rewriting to /auth");
			return NextResponse.rewrite(new URL(`/auth${search}`, req.url));
		}

		if (path.startsWith("/admin")) {
			const sessionCookie = getSessionCookie(req);
			if (!sessionCookie) {
				console.log("🔒 No session cookie found, redirecting to /auth");
				return NextResponse.redirect(new URL("/", req.url));
			}
			console.log("🔀 Rewriting to /admin");
			if (path === "/admin") {
				return NextResponse.rewrite(new URL(`/admin${search}`, req.url));
			} else {
				console.log("🚀 ~ middleware ~ path:", path);
				return NextResponse.rewrite(new URL(`${path}${search}`, req.url));
			}
		}

		// For root domain, serve the home routes (no rewrite needed as (home) is the default)
		console.log("🏠 Serving root domain home page");
		return NextResponse.next();
	}

	// Subdomain logic
	if (hostname.endsWith(rootDomain) && hostname !== rootDomain) {
		const username = hostname.replace(`.${rootDomain}`, "");
		console.log("👤 Subdomain detected:", username);
		console.log("🔍 Hostname ends with rootDomain:", hostname.endsWith(rootDomain));
		console.log("🔍 Hostname !== rootDomain:", hostname !== rootDomain);

		if (username && username !== rootDomain) {
			const sessionCookie = getSessionCookie(req);
			console.log("🚀 ~ middleware ~ sessionCookie:", sessionCookie);
			if (path.startsWith("/admin")) {
				if (!sessionCookie) {
					console.log("🔒 No session cookie found, redirecting to /auth");
					return NextResponse.redirect(new URL("/", req.url));
				}
				if (path === "/admin") {
					return NextResponse.rewrite(new URL(`/admin${search}`, req.url));
				} else {
					return NextResponse.rewrite(new URL(`${path}${search}`, req.url));
				}
			}
			// Rewrite subdomain requests to the org route group
			console.log("🔀 Rewriting subdomain to org route");
			const rewriteUrl = `/org/${username}${path === "/" ? "" : path}${search}`;
			console.log("🔀 Rewrite URL:", rewriteUrl);
			return NextResponse.rewrite(new URL(rewriteUrl, req.url));
		}
	}

	console.log("➡️ No rewrite, continuing request");
	return NextResponse.next();
}
