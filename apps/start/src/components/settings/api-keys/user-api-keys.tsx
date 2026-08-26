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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Spinner } from "@repo/ui/components/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";
import { formatDate, isApiKeyScope, scopeDefinition } from "@repo/util";
import { IconDots, IconKey, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CreateKeyDialog } from "@/components/settings/api-keys/create-key-dialog";
import { RevealKeyDialog } from "@/components/settings/api-keys/reveal-key-dialog";
import {
	type ApiKeyListItem,
	type ApiKeyWithSecret,
	listApiKeys,
	regenerateApiKey,
	revokeApiKey,
} from "@/lib/fetches/apiKeys";
import { useToastAction } from "@/lib/util";

/** How many scope badges to render before collapsing the rest into a counter. */
const VISIBLE_SCOPE_BADGES = 3;

type PendingAction = { type: "regenerate" | "revoke"; apiKey: ApiKeyListItem } | null;

function formatMaybeDate(value: string | null, fallback: string) {
	if (!value) return fallback;
	return formatDate(value);
}

function scopeLabel(scope: string) {
	return isApiKeyScope(scope) ? scopeDefinition(scope).label : scope;
}

function isExpired(apiKey: ApiKeyListItem) {
	return apiKey.expiresAt !== null && new Date(apiKey.expiresAt).getTime() <= Date.now();
}

function StatusBadge({ apiKey }: { apiKey: ApiKeyListItem }) {
	if (isExpired(apiKey)) {
		return <Badge variant="destructive">Expired</Badge>;
	}
	if (!apiKey.enabled) {
		return <Badge variant="secondary">Disabled</Badge>;
	}
	return <Badge variant="default">Active</Badge>;
}

function ScopeBadges({ scopes }: { scopes: string[] }) {
	if (scopes.length === 0) {
		return <span className="text-xs text-muted-foreground">No scopes</span>;
	}

	const visible = scopes.slice(0, VISIBLE_SCOPE_BADGES);
	const hidden = scopes.slice(VISIBLE_SCOPE_BADGES);

	return (
		<div className="flex flex-wrap items-center gap-1">
			{visible.map((scope) => (
				<Badge key={scope} variant="outline" className="font-normal">
					{scopeLabel(scope)}
				</Badge>
			))}
			{hidden.length > 0 && (
				<Badge variant="secondary" className="font-normal" title={hidden.map(scopeLabel).join(", ")}>
					+{hidden.length}
				</Badge>
			)}
		</div>
	);
}

export function UserApiKeys() {
	const queryClient = useQueryClient();
	const { runWithToast } = useToastAction();

	const [createOpen, setCreateOpen] = useState(false);
	const [pendingAction, setPendingAction] = useState<PendingAction>(null);
	const [revealedKey, setRevealedKey] = useState<ApiKeyWithSecret | null>(null);
	const [revealMode, setRevealMode] = useState<"created" | "regenerated">("created");

	const keysQuery = useQuery<ApiKeyListItem[]>({
		queryKey: ["apiKeys"],
		queryFn: listApiKeys,
	});

	const apiKeys = keysQuery.data ?? [];

	const regenerateMutation = useMutation({
		mutationFn: async (apiKey: ApiKeyListItem) =>
			runWithToast(
				`regenerate-api-key-${apiKey.id}`,
				{
					loading: { title: "Regenerating key...", description: `Rotating "${apiKey.name ?? "API key"}"` },
					success: { title: "API key regenerated", description: "The previous key no longer works." },
					error: { title: "Failed to regenerate key", description: "An error occurred." },
				},
				() => regenerateApiKey(apiKey.id)
			),
		onSuccess: async (result) => {
			if (!result?.success || !result.data) return;
			await queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
			setRevealMode("regenerated");
			setRevealedKey(result.data);
		},
	});

	const revokeMutation = useMutation({
		mutationFn: async (apiKey: ApiKeyListItem) =>
			runWithToast(
				`revoke-api-key-${apiKey.id}`,
				{
					loading: { title: "Revoking key...", description: `Revoking "${apiKey.name ?? "API key"}"` },
					success: { title: "API key revoked", description: "Anything using this key will stop working." },
					error: { title: "Failed to revoke key", description: "An error occurred." },
				},
				() => revokeApiKey(apiKey.id)
			),
		onSuccess: async (result) => {
			if (!result?.success) return;
			await queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
		},
	});

	const isMutating = regenerateMutation.isPending || revokeMutation.isPending;

	const handleCreated = (apiKey: ApiKeyWithSecret) => {
		setRevealMode("created");
		setRevealedKey(apiKey);
	};

	const handleConfirm = () => {
		if (!pendingAction) return;
		if (pendingAction.type === "regenerate") {
			regenerateMutation.mutate(pendingAction.apiKey);
		} else {
			revokeMutation.mutate(pendingAction.apiKey);
		}
		setPendingAction(null);
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-start justify-between gap-3">
				<p className="text-xs text-muted-foreground max-w-xl">
					Personal API keys let scripts and tools act on your behalf. Each key is shown once at creation — store it
					somewhere safe.
				</p>
				<Button size="sm" className="shrink-0 gap-1" onClick={() => setCreateOpen(true)}>
					<IconPlus className="size-4" />
					Create key
				</Button>
			</div>

			{keysQuery.isLoading ? (
				<div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
					<Spinner />
					Loading API keys...
				</div>
			) : keysQuery.isError ? (
				<div className="flex flex-col items-center justify-center gap-2 rounded-lg border py-10">
					<p className="text-sm text-muted-foreground">Failed to load your API keys.</p>
					<Button size="sm" variant="outline" onClick={() => keysQuery.refetch()}>
						Try again
					</Button>
				</div>
			) : apiKeys.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-2 rounded-lg border py-10 text-center">
					<IconKey className="size-8 text-muted-foreground opacity-50" />
					<p className="text-sm font-medium">No API keys yet</p>
					<p className="text-xs text-muted-foreground max-w-sm">
						Create a key to use the Sayr API from a script, a CI job, or your own tooling.
					</p>
					<Button size="sm" variant="outline" className="mt-1 gap-1" onClick={() => setCreateOpen(true)}>
						<IconPlus className="size-4" />
						Create key
					</Button>
				</div>
			) : (
				<div className="rounded-lg border overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Key</TableHead>
								<TableHead>Scopes</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Created</TableHead>
								<TableHead>Expires</TableHead>
								<TableHead>Last used</TableHead>
								<TableHead className="text-right">Requests</TableHead>
								<TableHead className="w-[50px]" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{apiKeys.map((apiKey) => (
								<TableRow key={apiKey.id}>
									<TableCell className="font-medium">{apiKey.name || "Untitled key"}</TableCell>
									<TableCell>
										<code className="text-xs bg-muted px-1.5 py-0.5 rounded">{apiKey.start ?? "—"}…</code>
									</TableCell>
									<TableCell>
										<ScopeBadges scopes={apiKey.scopes} />
									</TableCell>
									<TableCell>
										<StatusBadge apiKey={apiKey} />
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{formatMaybeDate(apiKey.createdAt, "—")}
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{formatMaybeDate(apiKey.expiresAt, "Never")}
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{formatMaybeDate(apiKey.lastRequest, "Never")}
									</TableCell>
									<TableCell className="text-sm text-muted-foreground text-right">
										{apiKey.requestCount}
									</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon" disabled={isMutating}>
													<IconDots className="size-4" />
													<span className="sr-only">Key actions</span>
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onSelect={() => setPendingAction({ type: "regenerate", apiKey })}>
													<IconRefresh className="size-4" />
													Regenerate
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													className="text-destructive focus:text-destructive"
													onSelect={() => setPendingAction({ type: "revoke", apiKey })}
												>
													<IconTrash className="size-4" />
													Revoke
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			<CreateKeyDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />

			<RevealKeyDialog
				open={revealedKey !== null}
				onOpenChange={(next) => {
					if (!next) setRevealedKey(null);
				}}
				apiKey={revealedKey}
				mode={revealMode}
			/>

			<AlertDialog
				open={pendingAction !== null}
				onOpenChange={(next) => {
					if (!next) setPendingAction(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{pendingAction?.type === "regenerate" ? "Regenerate API key" : "Revoke API key"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{pendingAction?.type === "regenerate"
								? `"${pendingAction.apiKey.name || "This key"}" will get a brand new secret. The old key stops working immediately — anything still using it will start failing until you paste in the new one.`
								: `"${pendingAction?.apiKey.name || "This key"}" will be permanently revoked. Anything using it stops working immediately, and this cannot be undone.`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirm}
							className={
								pendingAction?.type === "revoke"
									? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
									: undefined
							}
						>
							{pendingAction?.type === "regenerate" ? "Regenerate" : "Revoke"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
