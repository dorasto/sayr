import { createFileRoute, redirect } from "@tanstack/react-router";
import { SubWrapper } from "@/components/generic/wrapper";
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
			<ConnectionsSettings />
		</SubWrapper>
	);
}
