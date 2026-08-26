import { createFileRoute, redirect } from "@tanstack/react-router";
import { SubWrapper } from "@/components/generic/wrapper";
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
		<SubWrapper title="API keys" description="Create and manage personal API keys for the Sayr API." style="compact">
			<div className="flex flex-col gap-3">
				<UserApiKeys />
			</div>
		</SubWrapper>
	);
}
