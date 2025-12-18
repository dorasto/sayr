import { SubWrapper } from "@/components/generic/wrapper";
import SettingsOrganizationPageTeam from "@/components/pages/admin/settings/orgId/team";
import { db } from "@repo/database";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const fetchInvites = createServerFn({ method: "GET" })
	.inputValidator((data: { orgId: string }) => data)
	.handler(async ({ data }) => {
		const invites = await db.query.invite.findMany({
			where: (invites, { eq, and }) => and(eq(invites.status, "pending"), eq(invites.organizationId, data.orgId)),
			with: {
				user: {},
			},
		});
		return { invites };
	});

export const Route = createFileRoute("/admin/settings/org/$orgId/team/")({
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
		<SubWrapper title="Team" style="compact">
			<div className="flex flex-col gap-3">
				<SettingsOrganizationPageTeam invites={invites} />
			</div>
		</SubWrapper>
	);
}
