import { useRouter } from "@tanstack/react-router";
import { useCallback } from "react";
import { useLayoutData } from "@/components/generic/Context";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { clearAuthCache } from "@/routes/(admin)/route";
import { UserSettingsContent } from "./user-settings-content";

// Re-export for consumers that import from this index
export { UserSettingsContent, UserPreferences } from "./user-settings-content";
export type { UserSettingsContentProps } from "./user-settings-content";

/**
 * Admin-context wrapper for UserSettingsContent.
 * Pulls account data from useLayoutData() and handles cache invalidation.
 */
export default function UserSettings() {
	const { ws, account, setAccount } = useLayoutData();
	const router = useRouter();

	useWebSocketSubscription({
		ws,
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
			onAccountUpdated={handleAccountUpdated}
		/>
	);
}
