import { IconKey } from "@tabler/icons-react";
import { useApiKeys } from "@/components/settings/api-keys/context";
import { CreateKeyForm } from "@/components/settings/api-keys/create-key-form";
import { KeyDetails } from "@/components/settings/api-keys/key-details";

/**
 * The single side-panel body. Handed to `setPanelContent` once; it re-renders
 * itself from context rather than being re-set on every selection change, which
 * is what keeps the panel in sync without re-firing the effect that installs it.
 */
export function ApiKeyPanel() {
	const { panelView, selectedKey } = useApiKeys();

	if (panelView?.kind === "create") {
		return <CreateKeyForm />;
	}

	if (panelView?.kind === "details") {
		// The row can disappear underneath us (revoked in another tab, or the
		// regenerate swap lands before the list refetches).
		if (!selectedKey) {
			return (
				<div className="flex flex-col items-center gap-2 py-10 text-center">
					<IconKey className="h-8 w-8 text-muted-foreground opacity-50" />
					<p className="text-xs text-muted-foreground">This key is no longer available.</p>
				</div>
			);
		}
		return <KeyDetails apiKey={selectedKey} />;
	}

	return (
		<div className="flex flex-col items-center gap-2 py-10 text-center">
			<IconKey className="h-8 w-8 text-muted-foreground opacity-50" />
			<p className="text-xs text-muted-foreground">Select a key to see its details.</p>
		</div>
	);
}
