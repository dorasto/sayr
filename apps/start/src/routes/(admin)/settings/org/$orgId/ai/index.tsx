import { SubWrapper } from "@/components/generic/wrapper";
import AiSettingsPage from "@/components/pages/admin/settings/orgId/ai";
import { createFileRoute } from "@tanstack/react-router";
import { seo } from "@/seo";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/ai/")({
	head: () => ({ meta: seo({ title: "AI · Settings" }) }),
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<SubWrapper title="AI" description="Control AI-powered features for your organization." style="compact">
			<AiSettingsPage />
		</SubWrapper>
	);
}
