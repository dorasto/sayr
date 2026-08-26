import { IconKey } from "@tabler/icons-react";
import { useApiKeys } from "@/components/settings/api-keys/context";

/**
 * Fixed header for the API key panel, height-matched to PageHeader.Identity (h-11).
 * Shows key icon + key name or "Create API key".
 */
export function ApiKeyPanelHeader() {
	const { panelView, selectedKey } = useApiKeys();

	const title =
		panelView?.kind === "create"
			? "Create API key"
			: panelView?.kind === "details"
				? (selectedKey?.name ?? "API key")
				: "API key";

	return (
		<div className="flex items-center gap-2 w-full flex-1 min-w-0">
			<IconKey className="h-4 w-4 shrink-0 text-muted-foreground" />
			<span className="text-xs font-medium truncate">{title}</span>
		</div>
	);
}
