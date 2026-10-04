import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import UserConnections from "@/components/pages/admin/settings/connections";
import { getConnectionSettings } from "@/lib/serverFunctions/account-settings";

export const CONNECTION_SETTINGS_QUERY_KEY = ["account-settings", "connections"] as const;

interface ConnectionsSettingsProps {
	/** Where a provider's OAuth flow returns after linking (the portal returns to the dialog). */
	callbackURL?: string;
}

/**
 * The Connections settings section (email login and linked accounts). Self-contained: it loads its own data, so it
 * renders the same on the admin `/settings/connections` page and in the portal's account dialog.
 */
export function ConnectionsSettings({ callbackURL }: ConnectionsSettingsProps) {
	const queryClient = useQueryClient();
	const connections = useQuery({
		queryKey: CONNECTION_SETTINGS_QUERY_KEY,
		queryFn: () => getConnectionSettings(),
	});

	if (connections.isError) {
		return (
			<div className="flex items-center justify-between gap-3 rounded-lg bg-card p-4 text-sm">
				<span className="text-muted-foreground">We could not load your connections.</span>
				<Button variant="outline" size="sm" onClick={() => connections.refetch()}>
					Retry
				</Button>
			</div>
		);
	}
	if (!connections.data) {
		return (
			<div className="flex flex-col gap-2" aria-busy="true">
				<Skeleton className="h-16 rounded-lg" />
				<Skeleton className="h-16 rounded-lg" />
				<Skeleton className="h-16 rounded-lg" />
			</div>
		);
	}
	return (
		<UserConnections
			{...connections.data}
			callbackURL={callbackURL}
			onChanged={() => queryClient.invalidateQueries({ queryKey: CONNECTION_SETTINGS_QUERY_KEY })}
		/>
	);
}
