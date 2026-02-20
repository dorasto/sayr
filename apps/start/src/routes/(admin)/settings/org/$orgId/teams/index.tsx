import { db } from "@repo/database";
import { Label } from "@repo/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import SettingsOrganizationPageTeams from "@/components/pages/admin/settings/orgId/teams";

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
		<div className="max-w-prose mx-auto p-3 md:p-6 w-full flex flex-col gap-9">
			<div className="flex flex-col">
				<Label variant="heading" className="text-2xl text-foreground">Teams</Label>
				<Label variant="subheading" className="text-muted-foreground">Group organization members into teams for permissions</Label>
			</div>
			<div className="flex flex-col gap-3">
				<SettingsOrganizationPageTeams teams={teams} />
			</div>
		</div>
	);
}
