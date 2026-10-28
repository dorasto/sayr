import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@repo/ui/components/card";
import { isApiKeyScope, scopeDefinition } from "@repo/util";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { useState } from "react";

/**
 * The provider signs this exact raw query string server-side (every param,
 * byte for byte) and re-verifies that signature on submit. Reading it from
 * `window.location.search` client-side is NOT safe here: TanStack Router
 * rewrites the address bar to its own canonical search-param serialization on
 * mount, which collapses the repeated `ba_param=x&ba_param=y&...` params this
 * provider relies on into a single JSON-array-encoded `ba_param`, corrupting
 * the signed string before any client code ever sees it (confirmed by
 * comparing a real browser navigation's window.location.search against the
 * server's own redirect body). Capturing it server-side via getRequestUrl(),
 * before the client router has a chance to touch the URL, avoids that.
 */
const getOauthQuery = createServerFn({ method: "GET" }).handler(() => {
	return getRequestUrl().search.slice(1);
});

export const Route = createFileRoute("/auth/consent")({
	component: RouteComponent,
	loader: async () => {
		const rawQuery = await getOauthQuery();
		return { rawQuery };
	},
});

const OIDC_SCOPE_LABELS: Record<string, string> = {
	openid: "Verify your identity",
	profile: "Read your name and profile photo",
	email: "Read your email address",
	offline_access: "Stay connected when you're not actively using it",
};

function scopeLabel(scope: string): string {
	if (isApiKeyScope(scope)) return scopeDefinition(scope).label;
	return OIDC_SCOPE_LABELS[scope] ?? scope;
}

function RouteComponent() {
	const { rawQuery } = Route.useLoaderData();
	const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
	const [error, setError] = useState<string | null>(null);

	const params = new URLSearchParams(rawQuery);
	const clientId = params.get("client_id") ?? "";
	const scopes = (params.get("scope") ?? "").split(" ").filter(Boolean);

	const respond = async (accept: boolean) => {
		setStatus("submitting");
		setError(null);
		const { data, error: consentError } = await authClient.oauth2.consent({ accept, oauth_query: rawQuery });
		if (consentError || !data?.url) {
			setStatus("error");
			setError(consentError?.message ?? "Something went wrong completing this request.");
			return;
		}
		window.location.href = data.url;
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Connect an app to Sayr</CardTitle>
					<CardDescription>
						{clientId
							? `An application (${clientId}) is requesting access to your Sayr account.`
							: "An application is requesting access to your Sayr account."}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground mb-2">It will be able to:</p>
					<ul className="list-disc pl-5 space-y-1 text-sm">
						{scopes.map((scope) => (
							<li key={scope}>{scopeLabel(scope)}</li>
						))}
					</ul>
					{error ? <p className="text-sm text-destructive mt-4">{error}</p> : null}
				</CardContent>
				<CardFooter className="flex gap-2 justify-end">
					<Button variant="outline" disabled={status === "submitting"} onClick={() => respond(false)}>
						Deny
					</Button>
					<Button disabled={status === "submitting"} onClick={() => respond(true)}>
						Allow
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
