import { db, schema } from "@repo/database";
import { IconStack2 } from "@tabler/icons-react";
import { and, eq } from "drizzle-orm";
import SettingsOrganizationViewDetailPage from "@/app/components/admin/settings/organization/view-detail";
import { SubWrapper } from "@/app/components/layout/wrapper";

export default async function SettingsOrgViewDetailPage({
	params,
}: {
	params: Promise<{ view_id: string; org_id: string }>;
}) {
	const { view_id, org_id } = await params;
	const views = await db
		.select()
		.from(schema.savedView)
		.where(and(eq(schema.savedView.id, view_id), eq(schema.savedView.organizationId, org_id)))
		.limit(1);
	const view = views[0];

	return (
		<SubWrapper
			title="Edit View"
			description="Manage settings for this saved view."
			style="compact"
			backButton={`/admin/settings/org/${org_id}/views`}
			icon={<IconStack2 />}
		>
			<SettingsOrganizationViewDetailPage viewId={view_id} initialView={view} />
		</SubWrapper>
	);
}
