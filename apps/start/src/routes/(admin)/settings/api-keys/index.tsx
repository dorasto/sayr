import { createFileRoute, redirect } from "@tanstack/react-router";
import { Page } from "@/components/generic/page";
import { ApiKeyPanelHeader } from "@/components/settings/api-keys/api-key-panel-header";
import { API_KEY_PANEL_ID, ApiKeysProvider } from "@/components/settings/api-keys/context";
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
						header: <ApiKeyPanelHeader />,
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
		</ApiKeysProvider>
	);
}
