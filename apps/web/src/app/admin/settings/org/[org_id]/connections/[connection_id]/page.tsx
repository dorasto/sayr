import { db, schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { getInstallationDetailsWithRepos } from "@repo/util/github/auth";
import { IconPlus } from "@tabler/icons-react";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { connections } from "@/app/components/admin/settings/organization/connections-data";
import SettingsOrganizationConnectionsGitHubPage, {
	type githubInstallationDetailsType,
	type githubRepositoryWithRepoName,
	SettingsOrganizationConnectionsGitHubSync,
} from "@/app/components/admin/settings/organization/github";
import { SubWrapper } from "@/app/components/layout/wrapper";

export default async function ConnectionPage({
	params,
}: {
	params: Promise<{ org_id: string; connection_id: string }>;
}) {
	const { org_id, connection_id } = await params;

	const connection = connections.find((c) => c.id === connection_id);
	if (!connection) {
		notFound();
	}

	const content = await renderConnectionComponent(connection_id, org_id);

	return (
		<SubWrapper
			title={connection.name}
			description={connection.description}
			icon={<connection.icon />}
			style="compact"
			backButton={`/admin/settings/org/${org_id}/connections`}
			backButtonText="Connections"
		>
			{content}
		</SubWrapper>
	);
}

async function renderConnectionComponent(connectionId: string, org_id: string) {
	switch (connectionId) {
		case "github": {
			let githubInfo: githubInstallationDetailsType | null = null;

			// Step 1️⃣ — fetch installation record from DB
			const githubInstall = await db.query.githubInstallation.findFirst({
				where: eq(schema.githubInstallation.organizationId, org_id),
				with: { user: true },
			});

			// Step 2️⃣ — load GitHub account + repos (if installed)
			if (githubInstall?.installationId) {
				githubInfo = await getInstallationDetailsWithRepos(githubInstall);
			}

			// Step 3️⃣ — load synced repos from our DB
			const githubConnectionsReq = await db.query.githubRepository.findMany({
				where: and(
					eq(schema.githubRepository.organizationId, org_id),
					eq(schema.githubRepository.installationId, githubInfo?.installationId ?? -1)
				),
			});

			const githubConnections = githubConnectionsReq.map((conn) => ({
				...conn,
				repoName: githubInfo?.repositories.find((r) => r.id === conn.repoId)?.full_name || "Unknown repo",
				avatarUrl: githubInfo?.account?.avatar_url,
			})) as githubRepositoryWithRepoName[];

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
								href={`https://github.com/apps/${process.env.GITHUB_APP_NAME}/installations/new?state=org_${org_id}`}
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
			);
		}

		default:
			return null;
	}
}
