import { db } from "@repo/database";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { SubWrapper } from "@/components/generic/wrapper";
import SettingsOrganizationPageTeams from "@/components/pages/admin/settings/orgId/teams";
import SettingsOrganizationPageTeamSettings from "@/components/pages/admin/settings/orgId/teamsetttings";

const fetchInvites = createServerFn({ method: "GET" })
	.inputValidator((data: { orgId: string }) => data)
	.handler(async ({ data }) => {
		const invites = await db.query.invite.findMany({
			where: (invites, { eq, and }) =>
				and(
					eq(invites.status, "pending"),
					eq(invites.organizationId, data.orgId),
				),
			with: {
				user: {},
			},
		});
		return { invites };
	});

export const Route = createFileRoute(
	"/admin/settings/org/$orgId/teams/$teamId/",
)({
	loader: async ({ params }) => {
		return await fetchInvites({
			data: {
				orgId: params.orgId,
			},
		});
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { invites } = Route.useLoaderData();

	return (
		<SubWrapper title="Team Name" style="compact">
			<div className="flex flex-col gap-3 w-full">
				<SettingsOrganizationPageTeamSettings />
			</div>
		</SubWrapper>
	);
}
