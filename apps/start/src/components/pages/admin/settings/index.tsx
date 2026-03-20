import { useRouter } from "@tanstack/react-router";
import { useCallback } from "react";
import { useLayoutData } from "@/components/generic/Context";
import { clearAuthCache } from "@/routes/(admin)/route";
import { UserSettingsContent } from "./user-settings-content";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";

// Re-export for consumers that import from this index
export { UserSettingsContent, UserPreferences } from "./user-settings-content";
export type { UserSettingsContentProps } from "./user-settings-content";

/**
 * Admin-context wrapper for UserSettingsContent.
 * Pulls account data from useLayoutData() and handles cache invalidation.
 */
export default function UserSettings() {
	const { serverEvents, account, setAccount, organizations } = useLayoutData();
	const router = useRouter();
	useServerEventsSubscription({
		serverEvents,
	});

	const handleAccountUpdated = useCallback(() => {
		// Refetch account data from the server to get the latest state
		setAccount({ ...account });
		clearAuthCache();
		router.invalidate();
	}, [account, setAccount, router]);

	return (
		<UserSettingsContent
			account={account}
			organizations={organizations}
			onAccountUpdated={handleAccountUpdated}
		/>
	);
}
