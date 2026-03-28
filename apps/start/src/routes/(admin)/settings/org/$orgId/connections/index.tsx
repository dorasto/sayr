import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import SettingsOrganizationConnectionsPage from "@/components/pages/admin/settings/orgId/connections/connections";
import { SubWrapper } from "@/components/generic/wrapper";
import { seo } from "@/seo";

export const Route = createFileRoute(
	"/(admin)/settings/org/$orgId/connections/",
)({
	head: () => ({ meta: seo({ title: "Connections · Settings" }) }),
	component: RouteComponent,
});

function RouteComponent() {
	const { orgId } = Route.useParams();

	const base =
		import.meta.env.VITE_APP_ENV === "development"
			? "/backend-api/internal"
			: "/api/internal";

	const { data: githubData } = useQuery({
		queryKey: ["organization", orgId, "connections", "github"],
		queryFn: async () => {
			const res = await fetch(
				`${base}/v1/admin/organization/${orgId}/connections/github`,
				{ credentials: "include" },
			);
			if (!res.ok) throw new Error("Failed to fetch");
			return res.json();
		},
	});

	const { data: integrationsData, isLoading: integrationsLoading } = useQuery({
		queryKey: ["integrations", "list", orgId],
		queryFn: async () => {
			const res = await fetch(
				`${base}/v1/admin/integrations/list?orgId=${orgId}`,
				{ credentials: "include" },
			);
			if (!res.ok) throw new Error("Failed to fetch");
			return res.json();
		},
	});

	const connectionStatus: Record<string, { connected: boolean; detail?: string }> = {
		github: {
			connected: (githubData?.data?.githubConnections?.length ?? 0) > 0,
			detail: githubData?.data?.githubConnections?.length
				? `${githubData.data.githubConnections.length} installation${githubData.data.githubConnections.length > 1 ? "s" : ""}`
				: undefined,
		},
	};

	const integrations: Array<{ id: string; name: string; description: string; icon?: string; enabled: boolean }> =
		integrationsData?.data ?? [];

	return (
		<SubWrapper
			title="Connections"
			description="Manage integrations and connections with third-party services."
			style="compact"
		>
			<div className="flex flex-col gap-3">
				<SettingsOrganizationConnectionsPage
					connectionStatus={connectionStatus}
					integrations={integrations}
					integrationsLoading={integrationsLoading}
				/>
			</div>
		</SubWrapper>
	);
}
