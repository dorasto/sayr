import { db } from "@repo/database";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import SettingsOrganizationPageTeamSettings from "@/components/pages/admin/settings/orgId/teamsetttings";
import { SubWrapper } from "@/components/generic/wrapper";
import { seo } from "@/seo";

/**
 * Fetch a single team and its members for the given org/team IDs.
 */
const fetchteam = createServerFn({ method: "GET" })
	.inputValidator((data: { orgid: string; teamid: string }) => data)
	.handler(async ({ data }) => {
		// Find the team within this organization
		const teamdata = await db.query.team.findFirst({
			where: (team, { eq, and }) => and(eq(team.organizationId, data.orgid), eq(team.name, data.teamid)),
			with: {
				members: {
					with: {
						member: {},
					},
				},
			},
		});

		// 🧭 Redirect if the team doesn't exist
		if (!teamdata) {
			throw redirect({
				to: "/settings/org/$orgId/teams",
				params: { orgId: data.orgid },
			});
		}

		return { team: teamdata };
	});

export const Route = createFileRoute("/(admin)/settings/org/$orgId/teams/$teamId/")({
	loader: async ({ params }) => {
		return await fetchteam({
			data: {
				orgid: params.orgId,
				teamid: params.teamId,
			},
		});
	},
	head: ({ loaderData }) => ({
		meta: seo({
			title: loaderData?.team?.name ? `${loaderData.team.name} · Teams · Settings` : "Teams · Settings",
		}),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const { team } = Route.useLoaderData();

	return (
		<SubWrapper title={team.name} style="compact">
			<div className="flex flex-col gap-3 w-full">
				{/* Team settings page can now consume the loaded team */}
				<SettingsOrganizationPageTeamSettings team={team} />
			</div>
		</SubWrapper>
	);
}
