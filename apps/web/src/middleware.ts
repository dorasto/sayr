import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export const config = {
	matcher: ["/((?!api|_next|_vercel|.*\\..*|$).*)"],
};

export default function middleware(req: NextRequest) {
	const url = req.nextUrl;
	const path = url.pathname;
	const search = url.search;
	const hostname = req.headers.get("host") || "";
	const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "";

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
				return NextResponse.rewrite(new URL(`/admin${path}${search}`, req.url));
			}
		}
	}

	// Subdomain logic
	if (hostname.endsWith(rootDomain)) {
		const username = hostname.replace(`.${rootDomain}`, "");
		console.log("👤 Subdomain detected:", username);
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
					return NextResponse.rewrite(new URL(`/admin${path}${search}`, req.url));
				}
			}
		}
		return NextResponse.rewrite(new URL("/home", req.url));
	}

	console.log("➡️ No rewrite, continuing request");
	return NextResponse.next();
}
