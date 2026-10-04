import { createFileRoute, redirect } from "@tanstack/react-router";
import { useLayoutData } from "@/components/admin/shell/context";
import { SubWrapper } from "@/components/generic/wrapper";
import { SecuritySettings } from "@/components/settings/sections/security-settings";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";
import { seo } from "@/seo";

export const Route = createFileRoute("/(admin)/settings/security/")({
	head: () => ({ meta: seo({ title: "Security · Settings" }) }),
	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/auth/login" });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { serverEvents } = useLayoutData();
	useServerEventsSubscription({ serverEvents });

	return (
		<SubWrapper title="Security" style="compact">
			<SecuritySettings />
		</SubWrapper>
	);
}
