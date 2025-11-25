import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { IconPlus } from "@tabler/icons-react";
import { notFound } from "next/navigation";
import { connections } from "@/app/components/admin/settings/organization/connections-data";
import SettingsOrganizationConnectionsGitHubPage, {
	SettingsOrganizationConnectionsGitHubSync,
} from "@/app/components/admin/settings/organization/github";
import { SubWrapper } from "@/app/components/layout/wrapper";

export default async function ConnectionPage({
	params,
}: {
	params: Promise<{ org_id: string; connection_id: string }>;
}) {
	const { connection_id } = await params;
	const connection = connections.find((c) => c.id === connection_id);

	if (!connection) {
		notFound();
	}

	return (
		<SubWrapper
			title={connection.name}
			description={connection.description}
			icon={<connection.icon />}
			style="compact"
			backButton={`/admin/settings/org/${(await params).org_id}/connections`}
			backButtonText="Connections"
		>
			{renderConnectionComponent(connection_id)}
		</SubWrapper>
	);
}

const renderConnectionComponent = (connectionId: string) => {
	switch (connectionId) {
		case "github":
			return (
				<>
					<div className="flex flex-col gap-3">
						<div className="flex items-start justify-between">
							<div className="flex flex-col">
								<Label variant={"heading"}>GitHub connections</Label>
								<Label variant={"description"}>
									Link your GitHub organizations and repositories to your Sayr organization
								</Label>
							</div>
							<Button variant={"ghost"} size={"icon"}>
								<IconPlus />
							</Button>
						</div>
						<SettingsOrganizationConnectionsGitHubPage />
					</div>
					<div className="flex flex-col gap-3">
						<div className="flex items-start justify-between">
							<div className="flex flex-col">
								<Label variant={"heading"}>Task syncing</Label>
								<Label variant={"description"}>Link categories to specific repositories for syncing</Label>
							</div>
							<Button variant={"ghost"} size={"icon"}>
								<IconPlus />
							</Button>
						</div>
						<SettingsOrganizationConnectionsGitHubSync />
					</div>
				</>
			);
		// Add more cases here for different connection types
		default:
			return null;
	}
};
