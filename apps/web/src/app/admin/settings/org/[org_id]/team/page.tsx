import { db } from "@repo/database";
import SettingsOrganizationPageTeam from "@/app/components/admin/settings/organization/team";
import { SubWrapper } from "@/app/components/layout/wrapper";

export default async function SettingsOrgPage({ params }: { params: Promise<{ org_id: string }> }) {
	const { org_id } = await params;
	const invites = await db.query.invite.findMany({
		where: (invites, { eq, and }) => and(eq(invites.status, "pending"), eq(invites.organizationId, org_id)),
		with: {
			user: {},
		},
	});
	return (
		<SubWrapper title="Team" style="compact">
			<div className="flex flex-col gap-3">
				<SettingsOrganizationPageTeam invites={invites} />
			</div>
		</SubWrapper>
	);
}
