import { IconKey } from "@tabler/icons-react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Page } from "@/components/generic/page";
import { API_KEY_PANEL_ID, ApiKeysProvider, useApiKeys } from "@/components/settings/api-keys/context";
import { RevealKeyDialog } from "@/components/settings/api-keys/reveal-key-dialog";
import { UserApiKeys } from "@/components/settings/api-keys/user-api-keys";
import { seo } from "@/seo";

export const Route = createFileRoute("/(admin)/settings/api-keys/")({
	head: () => ({ meta: seo({ title: "API keys · Settings" }) }),
	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/auth/login" });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<ApiKeysProvider>
			<Page
				panels={{
					right: {
						id: API_KEY_PANEL_ID,
						width: "28rem",
						persistOpenState: false,
						// A PanelHeaderConfig object, not a raw node — that's what gets the
						// native h-11 header bar with its built-in close button. This is
						// only the pre-selection fallback; openCreate/openDetails in
						// context.tsx overwrite it via sidebarActions.setPanelHeader once
						// something is actually selected.
						header: { title: "API key", icon: <IconKey className="h-4 w-4 shrink-0 text-muted-foreground" /> },
					},
				}}
			>
				<div className="flex flex-col gap-3 p-4">
					<div>
						<h1 className="text-lg font-semibold">API keys</h1>
						<p className="text-sm text-muted-foreground">Create and manage personal API keys for the Sayr API.</p>
					</div>
					<UserApiKeys />
				</div>
			</Page>
			<RevealKeyDialogHost />
		</ApiKeysProvider>
	);
}

/**
 * Mounts the one-time secret reveal. Create and regenerate both close the side
 * panel and set `revealed` on the shared context; without something rendering
 * it, the plaintext key is generated, handed to the client, and then silently
 * dropped. This host is what makes it actually appear — it has to live inside
 * `ApiKeysProvider` (for `useApiKeys()`) but outside `Page`'s panel content, since
 * the reveal is a modal `Dialog`, not panel content.
 */
function RevealKeyDialogHost() {
	const { revealed, dismissReveal } = useApiKeys();

	return (
		<RevealKeyDialog
			open={revealed !== null}
			onOpenChange={(open) => {
				if (!open) dismissReveal();
			}}
			apiKey={revealed?.apiKey ?? null}
			mode={revealed?.mode ?? "created"}
		/>
	);
}
