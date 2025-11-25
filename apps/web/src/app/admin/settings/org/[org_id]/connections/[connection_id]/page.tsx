import { db, schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { getInstallationDetailsWithRepos } from "@repo/util/github/auth";
import { IconPlus } from "@tabler/icons-react";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { connections } from "@/app/components/admin/settings/organization/connections-data";
import SettingsOrganizationConnectionsGitHubPage, {
	type githubInstallationDetailsType,
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
			{await renderConnectionComponent(connection_id, (await params).org_id)}
		</SubWrapper>
	);
}

const renderConnectionComponent = async (connectionId: string, org_id: string) => {
	switch (connectionId) {
		case "github": {
			let githubInfo: githubInstallationDetailsType | null = null;
			const github = await db.query.githubInstallation.findFirst({
				where: eq(schema.githubInstallation.organizationId, org_id),
				with: { user: {} },
			});
			if (github) {
				githubInfo = await getInstallationDetailsWithRepos(github);
			}

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
						<SettingsOrganizationConnectionsGitHubPage githubInfo={githubInfo} />
					</div>
					<div className="flex flex-col gap-3">
						{/* <div className="flex items-start justify-between">
							<div className="flex flex-col">
								<Label variant={"heading"}>Task syncing</Label>
								<Label variant={"description"}>Link categories to specific repositories for syncing</Label>
							</div>
							<Button variant={"ghost"} size={"icon"}>
								<IconPlus />
							</Button>
						</div> */}
						<SettingsOrganizationConnectionsGitHubSync githubInfo={githubInfo} />
					</div>
				</>
			);
		}
		// Add more cases here for different connection types
		default:
			return null;
	}
};
