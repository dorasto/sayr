import { db } from "@repo/database";
import { Label } from "@repo/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import SettingsOrganizationPageTeam from "@/components/pages/admin/settings/orgId/members";

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

export const Route = createFileRoute("/(admin)/settings/org/$orgId/members/")({
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
		<div className="max-w-prose mx-auto p-3 md:p-6 w-full flex flex-col gap-9">
			<div className="flex flex-col">
				<Label variant="heading" className="text-2xl text-foreground">Team members</Label>
			</div>
			<div className="flex flex-col gap-3">
				<SettingsOrganizationPageTeam invites={invites} />
			</div>
		</div>
	);
}
