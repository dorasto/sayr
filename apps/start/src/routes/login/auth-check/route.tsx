import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/login/auth-check")({
  component: RouteComponent,
});

function getCookie(name: string) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];
}

function clearCookie(name: string, domain?: string) {
  const parts = [
    `${name}=`,
    "path=/",
    "max-age=0",
    "samesite=lax",
  ];

  if (domain) {
    parts.push(`domain=.${domain}`);
  }

  document.cookie = parts.join("; ");
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

function RouteComponent() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const originRaw = getCookie("login_origin");

    let redirectTo = import.meta.env.VITE_URL_ROOT ?? "/";

    if (originRaw) {
      redirectTo = decodeURIComponent(originRaw);
    }

    const domain = originRaw
      ? getCookieDomain(decodeURIComponent(originRaw))
      : undefined;

    clearCookie("login_origin", domain);

    window.location.href = redirectTo;
  }, []);

  return (
    <main className="min-h-screen grid place-items-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-10 py-8 shadow-lg">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
          aria-hidden
        />
        <h1 className="text-lg font-semibold tracking-tight">
          Signing you in
        </h1>
        <p className="text-sm text-muted-foreground">
          Just a moment — we’re getting everything ready.
        </p>
      </div>
    </main>
  );
}