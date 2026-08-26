import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import { API_KEY_SCOPES, type ApiKeyScopeResource, parseScope, scopeDefinition } from "@repo/util";
import { IconRefresh, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useApiKeys } from "@/components/settings/api-keys/context";
import { formatMaybeDate, formatRateLimit, isExpired, StatusBadge } from "@/components/settings/api-keys/shared";
import type { ApiKeyListItem } from "@/lib/fetches/apiKeys";

type PendingAction = "regenerate" | "revoke" | null;

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex items-start justify-between gap-3 py-1.5">
			<span className="text-xs text-muted-foreground shrink-0">{label}</span>
			<span className="text-xs text-right break-words min-w-0">{children}</span>
		</div>
	);
}

/** Groups the key's scopes by catalog category so the panel mirrors the picker. */
function GrantedScopes({ scopes }: { scopes: string[] }) {
	if (scopes.length === 0) {
		return <p className="text-xs text-muted-foreground">This key has no scopes.</p>;
	}

	const groups = (Object.keys(API_KEY_SCOPES) as ApiKeyScopeResource[])
		.map((resource) => ({
			resource,
			title: `${resource.charAt(0).toUpperCase()}${resource.slice(1)}`,
			scopes: scopes.filter((scope) => parseScope(scope)?.resource === resource),
		}))
		.filter((group) => group.scopes.length > 0);

	// Anything the catalog no longer knows about, so a stale grant stays visible.
	const unknown = scopes.filter((scope) => parseScope(scope) === null);

	return (
		<div className="flex flex-col gap-3">
			{groups.map((group) => (
				<div key={group.resource} className="flex flex-col gap-1.5">
					<span className="text-xs font-medium text-muted-foreground">{group.title}</span>
					<div className="flex flex-col gap-1">
						{group.scopes.map((scope) => {
							const definition = parseScope(scope) ? scopeDefinition(scope as never) : null;
							return (
								<div key={scope} className="flex flex-col rounded-md border px-2 py-1.5">
									<span className="text-xs font-medium">{definition?.label ?? scope}</span>
									{definition?.description && (
										<span className="text-[11px] text-muted-foreground">{definition.description}</span>
									)}
								</div>
							);
						})}
					</div>
				</div>
			))}
			{unknown.length > 0 && (
				<div className="flex flex-wrap gap-1">
					{unknown.map((scope) => (
						<Badge key={scope} variant="secondary" className="text-xs">
							{scope}
						</Badge>
					))}
				</div>
			)}
		</div>
	);
}

export function KeyDetails({ apiKey }: { apiKey: ApiKeyListItem }) {
	const { regenerate, revoke, isMutating } = useApiKeys();
	const [pending, setPending] = useState<PendingAction>(null);

	const expired = isExpired(apiKey);
	const name = apiKey.name ?? "Untitled key";

	const confirm = () => {
		if (pending === "regenerate") regenerate(apiKey);
		if (pending === "revoke") revoke(apiKey);
		setPending(null);
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-2">
				<span className="font-mono text-xs text-muted-foreground">
					{apiKey.start ? `${apiKey.start}…` : "—"}
				</span>
				<StatusBadge apiKey={apiKey} />
			</div>

			<Separator />

			<div className="flex flex-col">
				<Label variant={"subheading"} className="mb-1">
					Details
				</Label>
				<DetailRow label="Created">{formatMaybeDate(apiKey.createdAt, "—")}</DetailRow>
				<DetailRow label="Expires">{formatMaybeDate(apiKey.expiresAt, "Never")}</DetailRow>
				<DetailRow label="Last used">{formatMaybeDate(apiKey.lastRequest, "Never")}</DetailRow>
				<DetailRow label="Requests">{apiKey.requestCount.toLocaleString()}</DetailRow>
				<DetailRow label="Rate limit">{formatRateLimit(apiKey)}</DetailRow>
			</div>

			<Separator />

			<div className="flex flex-col gap-2">
				<Label variant={"subheading"}>Scopes</Label>
				<GrantedScopes scopes={apiKey.scopes} />
			</div>

			<Separator />

			<div className="flex flex-col gap-2">
				<Button
					variant="outline"
					className="w-full gap-2"
					disabled={isMutating || expired}
					onClick={() => setPending("regenerate")}
				>
					<IconRefresh className="size-4" />
					Regenerate
				</Button>
				{expired && (
					<p className="text-[11px] text-muted-foreground">
						Expired keys can't be regenerated — create a new key instead.
					</p>
				)}
				<Button
					variant="ghost"
					className="w-full gap-2 text-destructive hover:text-destructive"
					disabled={isMutating}
					onClick={() => setPending("revoke")}
				>
					<IconTrash className="size-4" />
					Revoke
				</Button>
			</div>

			<AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{pending === "regenerate" ? "Regenerate API key" : "Revoke API key"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{pending === "regenerate"
								? `"${name}" will get a brand new secret. The old key stops working immediately — anything still using it will start failing until you paste in the new one.`
								: `"${name}" will be permanently revoked. Anything using it stops working immediately, and this cannot be undone.`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirm}
							className={pending === "revoke" ? "bg-destructive hover:bg-destructive/90" : undefined}
						>
							{pending === "regenerate" ? "Regenerate" : "Revoke"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
