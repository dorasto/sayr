import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@repo/ui/components/card";
import { isApiKeyScope, scopeDefinition } from "@repo/util";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/auth/consent")({
	component: RouteComponent,
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
	const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
	const [error, setError] = useState<string | null>(null);
	const [request, setRequest] = useState<{ clientId: string; scopes: string[] } | null>(null);

	// Display only. The signed query itself is attached to the consent call by
	// better-auth's oauthProviderClient plugin, straight from window.location.search
	// (kept intact by the router's search serializer — see router.tsx).
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		setRequest({
			clientId: params.get("client_id") ?? "",
			scopes: (params.get("scope") ?? "").split(" ").filter(Boolean),
		});
	}, []);

	const respond = async (accept: boolean) => {
		setStatus("submitting");
		setError(null);
		const { data, error: consentError } = await authClient.oauth2.consent({ accept });
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
						{request?.clientId
							? `An application (${request.clientId}) is requesting access to your Sayr account.`
							: "An application is requesting access to your Sayr account."}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground mb-2">It will be able to:</p>
					<ul className="list-disc pl-5 space-y-1 text-sm">
						{request?.scopes.map((scope) => (
							<li key={scope}>{scopeLabel(scope)}</li>
						))}
					</ul>
					{error ? <p className="text-sm text-destructive mt-4">{error}</p> : null}
				</CardContent>
				<CardFooter className="flex gap-2 justify-end">
					<Button
						variant="outline"
						disabled={request === null || status === "submitting"}
						onClick={() => respond(false)}
					>
						Deny
					</Button>
					<Button disabled={request === null || status === "submitting"} onClick={() => respond(true)}>
						Allow
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
