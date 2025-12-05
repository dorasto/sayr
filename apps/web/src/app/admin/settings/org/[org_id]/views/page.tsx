import SettingsOrganizationViewsPage from "@/app/components/admin/settings/organization/views";
import { SubWrapper } from "@/app/components/layout/wrapper";

export default async function SettingsOrgViewsPage() {
	return (
		<SubWrapper title="Saved Views" description="Manage your organization's saved views for tasks." style="compact">
			<div className="flex flex-col gap-3">
				<SettingsOrganizationViewsPage />
			</div>
		</SubWrapper>
	);
}
