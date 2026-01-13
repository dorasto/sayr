import { createFileRoute } from "@tanstack/react-router";

function getCookie(
  request: Request,
  name: string,
): string | undefined {
  const cookie = request.headers.get("cookie");
  if (!cookie) return undefined;

  return cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];
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

export const Route = createFileRoute("/login/auth-check")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const originRaw = getCookie(request, "login_origin");

        let redirectTo =
          import.meta.env.VITE_URL_ROOT ?? "/";

        if (originRaw) {
          redirectTo = decodeURIComponent(originRaw);
        }

        const domain = originRaw
          ? getCookieDomain(decodeURIComponent(originRaw))
          : undefined;

        // Clear cookie
        const clearCookie = [
          "login_origin=",
          "path=/",
          "max-age=0",
          "samesite=lax",
        ];

        if (domain) {
          clearCookie.push(`domain=.${domain}`);
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: redirectTo,
            "Set-Cookie": clearCookie.join("; "),
          },
        });
      },
    },
  },
});