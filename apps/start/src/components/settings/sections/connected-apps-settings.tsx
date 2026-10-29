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
import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import { Skeleton } from "@repo/ui/components/skeleton";
import { IconPlugConnected } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type ConnectedApp, getConnectedApps, revokeConnectedApp } from "@/lib/serverFunctions/connected-apps";
import { useToastAction } from "@/lib/util";

const CONNECTED_APPS_QUERY_KEY = ["account-settings", "connected-apps"] as const;

/** CIMD clients use their metadata URL as the client id, so its host is a readable fallback name. */
function appName(app: ConnectedApp) {
	if (app.name) return app.name;
	try {
		return new URL(app.clientId).host;
	} catch {
		return app.clientId;
	}
}

/** AI apps and MCP clients the user has authorized through the OAuth consent screen, with a way to revoke each. */
export function ConnectedAppsSettings() {
	const queryClient = useQueryClient();
	const { runWithToast, isFetching } = useToastAction();
	const [pending, setPending] = useState<ConnectedApp | null>(null);
	const apps = useQuery({ queryKey: CONNECTED_APPS_QUERY_KEY, queryFn: () => getConnectedApps() });

	const revoke = async (app: ConnectedApp) => {
		await runWithToast(
			"revoke-connected-app",
			{
				loading: { title: "Revoking access..." },
				success: { title: "Access revoked", description: `${appName(app)} can no longer access your account.` },
				error: { title: "Couldn't revoke access" },
			},
			() => revokeConnectedApp({ data: { id: app.id } })
		);
		await queryClient.invalidateQueries({ queryKey: CONNECTED_APPS_QUERY_KEY });
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-col">
				<Label variant="subheading">Connected apps</Label>
				<span className="text-xs text-muted-foreground">
					AI assistants and other apps you've allowed to act on your behalf through Sayr's MCP server.
				</span>
			</div>

			{apps.isError ? (
				<div className="flex items-center justify-between gap-3 rounded-lg bg-card p-4 text-sm">
					<span className="text-muted-foreground">We could not load your connected apps.</span>
					<Button variant="outline" size="sm" onClick={() => apps.refetch()}>
						Retry
					</Button>
				</div>
			) : !apps.data ? (
				<Skeleton className="h-16 rounded-lg" />
			) : apps.data.length === 0 ? (
				<div className="rounded-lg bg-card p-4 text-sm text-muted-foreground">No apps are connected.</div>
			) : (
				apps.data.map((app) => (
					<div key={app.id} className="bg-card rounded-lg flex flex-col">
						<Tile className="md:w-full">
							<TileHeader>
								<TileIcon className="size-10 bg-transparent relative p-0 overflow-hidden">
									<Avatar className="w-full h-full rounded-md">
										<AvatarFallback className="rounded-md">
											<IconPlugConnected className="size-5" />
										</AvatarFallback>
									</Avatar>
								</TileIcon>
								<TileTitle>{appName(app)}</TileTitle>
								<TileDescription className="text-xs">
									{app.connectedAt ? `Connected ${new Date(app.connectedAt).toLocaleDateString()} · ` : ""}
									{app.scopes.length} {app.scopes.length === 1 ? "permission" : "permissions"}
								</TileDescription>
							</TileHeader>
							<TileAction>
								<Button variant="primary" size="sm" disabled={isFetching} onClick={() => setPending(app)}>
									Revoke
								</Button>
							</TileAction>
						</Tile>
					</div>
				))
			)}

			<AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Revoke access</AlertDialogTitle>
						<AlertDialogDescription>
							{pending ? appName(pending) : "This app"} will immediately lose access to your Sayr account. To use
							it again, you'll need to reconnect and approve it.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive hover:bg-destructive/90"
							onClick={() => {
								if (pending) revoke(pending);
								setPending(null);
							}}
						>
							Revoke
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
