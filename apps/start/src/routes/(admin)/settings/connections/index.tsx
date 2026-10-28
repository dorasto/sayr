import { createFileRoute, redirect } from "@tanstack/react-router";
import { SubWrapper } from "@/components/generic/wrapper";
import { ConnectedAppsSettings } from "@/components/settings/sections/connected-apps-settings";
import { ConnectionsSettings } from "@/components/settings/sections/connections-settings";
import { seo } from "@/seo";

export const Route = createFileRoute("/(admin)/settings/connections/")({
	head: () => ({ meta: seo({ title: "Connections · Settings" }) }),
	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/auth/login" });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<SubWrapper
			title="Connections"
			style="compact"
			description="Connect accounts to sign in with and power integrations"
		>
			<div className="flex flex-col gap-6">
				<ConnectionsSettings />
				{import.meta.env.VITE_SAYR_EDITION === "cloud" && <ConnectedAppsSettings />}
			</div>
		</SubWrapper>
	);
}
