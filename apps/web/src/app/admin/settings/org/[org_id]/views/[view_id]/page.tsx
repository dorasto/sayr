import { IconStack2 } from "@tabler/icons-react";
import SettingsOrganizationViewDetailPage from "@/app/components/admin/settings/organization/view-detail";
import { SubWrapper } from "@/app/components/layout/wrapper";

export default async function SettingsOrgViewDetailPage({
	params,
}: {
	params: Promise<{ view_id: string; org_id: string }>;
}) {
	const { view_id, org_id } = await params;
	return (
		<SubWrapper
			title="Edit View"
			description="Manage settings for this saved view."
			style="compact"
			backButton={`/admin/settings/org/${org_id}/views`}
			icon={<IconStack2 />}
		>
			<SettingsOrganizationViewDetailPage viewId={view_id} />
		</SubWrapper>
	);
}
