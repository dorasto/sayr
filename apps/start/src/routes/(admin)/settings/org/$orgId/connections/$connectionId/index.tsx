import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { SubWrapper } from "@/components/generic/wrapper";
import { connections } from "@/components/pages/admin/settings/orgId/connections/connections-data";
import SettingsOrganizationConnectionsGitHubPage, {
	SettingsOrganizationConnectionsGitHubSync,
} from "@/components/pages/admin/settings/orgId/connections/github";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/connections/$connectionId/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { orgId, connectionId } = Route.useParams();
	const connection = connections.find((c) => c.id === connectionId);

	const { data: githubData } = useQuery({
		queryKey: ["organization", orgId, "connections", "github"],
		queryFn: async () => {
			const res = await fetch(
				`${import.meta.env.VITE_APP_ENV === "development" ? import.meta.env.VITE_EXTERNAL_API_URL : ""}/admin/organization/${orgId}/connections/github`,
				{ credentials: "include" }
			)
			if (!res.ok) throw new Error("Failed to fetch");
			return res.json();
		},
		enabled: connectionId === "github",
	});

	if (!connection) {
		return <div>Connection not found</div>;
	}

	const githubInfo = githubData?.data?.githubInfo;
	const githubConnections = githubData?.data?.githubConnections || [];
	const appName = import.meta.env.VITE_GITHUB_APP_NAME;

	const renderContent = () => {
		switch (connectionId) {
			case "github":
				return (
					<>
						{/* Connection Overview */}
						<div className="flex flex-col gap-3">
							<div className="flex items-start justify-between">
								<div className="flex flex-col">
									<Label variant="heading">GitHub connections</Label>
									<Label variant="description">
										Link your GitHub organizations and repositories to your Sayr organization.
									</Label>
								</div>
								<a
									href={`https://github.com/apps/${appName}/installations/new?state=org_${orgId}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									<Button variant="ghost" size="icon">
										<IconPlus />
									</Button>
								</a>
							</div>

							<SettingsOrganizationConnectionsGitHubPage githubInfo={githubInfo} />
						</div>

						{/* Task Sync Section */}
						<div className="flex flex-col gap-3">
							<SettingsOrganizationConnectionsGitHubSync
								githubInfo={githubInfo}
								githubConnections={githubConnections}
							/>
						</div>
					</>
				)
			default:
				return null;
		}
	}

	return (
		<SubWrapper
			title={connection.name}
			description={connection.description}
			icon={<connection.icon />}
			style="compact"
			backButton={`..`}
			backButtonText="Connections"
		>
			{renderContent()}
		</SubWrapper>
	)
}
