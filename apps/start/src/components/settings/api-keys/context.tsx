import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { ApiKeyPanel } from "@/components/settings/api-keys/api-key-panel";
import {
	type ApiKeyListItem,
	type ApiKeyWithSecret,
	listApiKeys,
	regenerateApiKey,
	revokeApiKey,
} from "@/lib/fetches/apiKeys";
import { sidebarActions, sidebarStore } from "@/lib/sidebar/sidebar-store";
import { useToastAction } from "@/lib/util";

export const API_KEY_PANEL_ID = "settings-api-key-panel";

/**
 * What the side panel is currently showing. `details` stores the key id rather
 * than the key itself so the panel always re-reads the live row from the query —
 * otherwise it would keep rendering a stale copy after a regenerate or a rename.
 */
type PanelView = { kind: "create" } | { kind: "details"; keyId: string } | null;

interface ApiKeysContextValue {
	apiKeys: ApiKeyListItem[];
	isLoading: boolean;
	isError: boolean;
	refetch: () => void;

	panelView: PanelView;
	selectedKey: ApiKeyListItem | null;
	openCreate: () => void;
	openDetails: (keyId: string) => void;
	closePanel: () => void;

	regenerate: (apiKey: ApiKeyListItem) => void;
	revoke: (apiKey: ApiKeyListItem) => void;
	isMutating: boolean;

	revealed: { apiKey: ApiKeyWithSecret; mode: "created" | "regenerated" } | null;
	reveal: (apiKey: ApiKeyWithSecret, mode: "created" | "regenerated") => void;
	dismissReveal: () => void;
}

const ApiKeysContext = createContext<ApiKeysContextValue | undefined>(undefined);

export function useApiKeys() {
	const context = useContext(ApiKeysContext);
	if (context === undefined) {
		throw new Error("useApiKeys must be used within an ApiKeysProvider");
	}
	return context;
}

export function ApiKeysProvider({ children }: { children: ReactNode }) {
	const queryClient = useQueryClient();
	const { runWithToast } = useToastAction();

	const [panelView, setPanelView] = useState<PanelView>(null);
	const [revealed, setRevealed] = useState<ApiKeysContextValue["revealed"]>(null);

	const keysQuery = useQuery<ApiKeyListItem[]>({
		queryKey: ["apiKeys"],
		queryFn: listApiKeys,
	});

	const apiKeys = keysQuery.data ?? [];

	const openCreate = useCallback(() => {
		setPanelView({ kind: "create" });
		sidebarActions.setPanelContent(API_KEY_PANEL_ID, <ApiKeyPanel />);
		sidebarActions.setOpen(API_KEY_PANEL_ID, true);
	}, []);

	const openDetails = useCallback(
		(keyId: string) => {
			const sidebar = sidebarStore.state.sidebars[API_KEY_PANEL_ID];
			const isOpen = sidebar?.open ?? false;
			const isSameKey = panelView?.kind === "details" && panelView.keyId === keyId;

			if (isOpen && isSameKey) {
				sidebarActions.close(API_KEY_PANEL_ID);
				setPanelView(null);
				return;
			}

			setPanelView({ kind: "details", keyId });
			sidebarActions.setPanelContent(API_KEY_PANEL_ID, <ApiKeyPanel />);
			sidebarActions.setOpen(API_KEY_PANEL_ID, true);
		},
		[panelView]
	);

	const closePanel = useCallback(() => {
		// close() rather than setOpen(false) so the exit animation plays.
		sidebarActions.close(API_KEY_PANEL_ID);
		setPanelView(null);
	}, []);

	const reveal = useCallback((apiKey: ApiKeyWithSecret, mode: "created" | "regenerated") => {
		setRevealed({ apiKey, mode });
	}, []);

	const dismissReveal = useCallback(() => setRevealed(null), []);

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
			// Regenerating replaces the row, so the old id no longer resolves.
			setPanelView({ kind: "details", keyId: result.data.id });
			setRevealed({ apiKey: result.data, mode: "regenerated" });
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
			closePanel();
		},
	});

	const selectedKey = useMemo(() => {
		if (panelView?.kind !== "details") return null;
		return apiKeys.find((key) => key.id === panelView.keyId) ?? null;
	}, [panelView, apiKeys]);

	const value = useMemo<ApiKeysContextValue>(
		() => ({
			apiKeys,
			isLoading: keysQuery.isLoading,
			isError: keysQuery.isError,
			refetch: () => void keysQuery.refetch(),
			panelView,
			selectedKey,
			openCreate,
			openDetails,
			closePanel,
			regenerate: (apiKey) => regenerateMutation.mutate(apiKey),
			revoke: (apiKey) => revokeMutation.mutate(apiKey),
			isMutating: regenerateMutation.isPending || revokeMutation.isPending,
			revealed,
			reveal,
			dismissReveal,
		}),
		[
			apiKeys,
			keysQuery,
			panelView,
			selectedKey,
			openCreate,
			openDetails,
			closePanel,
			regenerateMutation,
			revokeMutation,
			revealed,
			reveal,
			dismissReveal,
		]
	);

	return <ApiKeysContext.Provider value={value}>{children}</ApiKeysContext.Provider>;
}
