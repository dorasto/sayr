import { db } from "@repo/database";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import SettingsOrganizationPageTeams from "@/components/pages/admin/settings/orgId/teams";
import { SubWrapper } from "@/components/generic/wrapper";

/**
 * Fetch all teams (and optional member summaries)
 * for a specific organization.
 */
const fetchTeams = createServerFn({ method: "GET" })
	.inputValidator((data: { orgId: string }) => data)
	.handler(async ({ data }) => {
		// Load all teams for this organization with members attached
		const teams = await db.query.team.findMany({
			where: (t, { eq }) => eq(t.organizationId, data.orgId),
			with: {
				members: {
					with: {
						member: {},
					},
				},
			},
		});

		return { teams };
	});

export const Route = createFileRoute("/(admin)/settings/org/$orgId/teams/")({
	loader: async ({ params }) =>
		fetchTeams({
			data: { orgId: params.orgId },
		}),
	component: RouteComponent,
});

function RouteComponent() {
	const { teams } = Route.useLoaderData();

	return (
		<SubWrapper title="Teams" description="Group organization members into teams for permissions" style="compact">
			<div className="flex flex-col gap-3">
				<SettingsOrganizationPageTeams teams={teams} />
			</div>
		</SubWrapper>
	);
}
