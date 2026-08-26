import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { Separator } from "@repo/ui/components/separator";
import { Spinner } from "@repo/ui/components/spinner";
import { IconAlertTriangle, IconKey, IconPlus } from "@tabler/icons-react";
import { useApiKeys } from "@/components/settings/api-keys/context";
import { scopeLabel, StatusBadge } from "@/components/settings/api-keys/shared";
import type { ApiKeyListItem } from "@/lib/fetches/apiKeys";

/** How many scope badges a row shows before collapsing the rest into a counter. */
const VISIBLE_SCOPE_BADGES = 2;

function ApiKeyRow({
	apiKey,
	isSelected,
	onSelect,
}: {
	apiKey: ApiKeyListItem;
	isSelected: boolean;
	onSelect: () => void;
}) {
	const visibleScopes = apiKey.scopes.slice(0, VISIBLE_SCOPE_BADGES);
	const hiddenCount = apiKey.scopes.length - visibleScopes.length;

	return (
		<button type="button" onClick={onSelect} className="w-full text-left">
			<Tile
				className={`md:w-full gap-3 transition-colors ${isSelected ? "bg-secondary hover:bg-secondary" : "hover:bg-accent"}`}
				variant={"transparent"}
			>
				<TileHeader className="min-w-1/3 shrink-0">
					<TileIcon className="bg-transparent">
						<Avatar className="h-10 w-10 rounded-full">
							<AvatarFallback className="rounded-md uppercase text-xs bg-primary/10">
								<IconKey className="h-5 w-5 text-primary" />
							</AvatarFallback>
						</Avatar>
					</TileIcon>
					<TileTitle>{apiKey.name ?? "Untitled key"}</TileTitle>
					<TileDescription className="font-mono">{apiKey.start ? `${apiKey.start}…` : "—"}</TileDescription>
				</TileHeader>
				<TileAction className="flex-1 min-w-0">
					<div className="flex gap-1 flex-1 overflow-hidden flex-wrap justify-end">
						{apiKey.scopes.length === 0 ? (
							<Badge variant="outline" className="gap-1 text-xs py-0 h-5">
								No scopes
							</Badge>
						) : (
							<>
								{visibleScopes.map((scope) => (
									<Badge
										key={scope}
										variant="outline"
										className="gap-1 text-xs py-0 h-5 bg-primary/10 border-primary/20 text-primary shrink-0"
									>
										<span className="truncate max-w-28">{scopeLabel(scope)}</span>
									</Badge>
								))}
								{hiddenCount > 0 && (
									<Badge variant="secondary" className="gap-1 text-xs py-0 h-5 shrink-0">
										+{hiddenCount}
									</Badge>
								)}
							</>
						)}
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<StatusBadge apiKey={apiKey} />
					</div>
				</TileAction>
			</Tile>
		</button>
	);
}

export function UserApiKeys() {
	const { apiKeys, isLoading, isError, refetch, panelView, openCreate, openDetails } = useApiKeys();
	const isCreateSelected = panelView?.kind === "create";

	return (
		<div className="flex flex-col gap-3">
			<p className="text-xs text-muted-foreground max-w-xl">
				Personal API keys let scripts and tools act on your behalf. Each key is shown once at creation — store it
				somewhere safe. Select a key to see its scopes, usage, and rate limit.
			</p>

			{isLoading ? (
				<div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
					<Spinner />
					Loading API keys...
				</div>
			) : isError ? (
				<div className="bg-card rounded-lg p-6 flex flex-col items-center gap-3 text-center">
					<IconAlertTriangle className="h-8 w-8 text-muted-foreground" />
					<p className="text-sm text-muted-foreground">We couldn't load your API keys.</p>
					<Button variant="outline" size="sm" onClick={refetch}>
						Try again
					</Button>
				</div>
			) : (
				<div className="bg-card rounded-lg flex flex-col">
					{/* Create row, matching the "Create Team" affordance on the teams page. */}
					<button type="button" onClick={openCreate} className="w-full text-left">
						<Tile
							className={`md:w-full transition-colors ${isCreateSelected ? "bg-secondary hover:bg-secondary" : "hover:bg-accent"}`}
							variant={"transparent"}
						>
							<TileHeader className="md:w-full">
								<TileIcon className="bg-transparent">
									<Avatar className="h-10 w-10 rounded-md">
										<AvatarFallback className="rounded-md uppercase text-xs">
											<IconPlus className="size-6!" />
										</AvatarFallback>
									</Avatar>
								</TileIcon>
								<TileTitle>Create key</TileTitle>
								<TileDescription>Generate a new personal API key</TileDescription>
							</TileHeader>
						</Tile>
					</button>

					{apiKeys.length > 0 && <Separator />}

					{apiKeys.map((apiKey) => (
						<ApiKeyRow
							key={apiKey.id}
							apiKey={apiKey}
							isSelected={panelView?.kind === "details" && panelView.keyId === apiKey.id}
							onSelect={() => openDetails(apiKey.id)}
						/>
					))}

					{apiKeys.length === 0 && (
						<div className="p-6 text-center text-muted-foreground">
							<IconKey className="h-12 w-12 mx-auto mb-3 opacity-50" />
							<p className="text-sm">
								No API keys yet. Create one to use the Sayr API from a script, a CI job, or your own tooling.
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
