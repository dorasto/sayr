import { createFileRoute } from "@tanstack/react-router";
import { SubWrapper } from "@/components/generic/wrapper";
import AiSettingsPage from "@/components/pages/admin/settings/orgId/ai";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { seo } from "@/seo";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/ai/")({
	head: () => ({ meta: seo({ title: "AI · Settings" }) }),
	component: RouteComponent,
});

function RouteComponent() {
	const { organization } = useLayoutOrganizationSettings();
	const isCloudEdition = (import.meta.env.VITE_SAYR_EDITION as string | undefined) === "cloud";
	const locked = isCloudEdition && organization.plan !== "pro";

	return (
		<SubWrapper title="AI" description="Control AI-powered features for your organization." style="compact">
			<AiSettingsPage locked={locked} />
		</SubWrapper>
	);
}
