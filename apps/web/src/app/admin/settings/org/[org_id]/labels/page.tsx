import { Label } from "@repo/ui/components/label";
import SettingsOrganizationLabelsPage from "@/app/components/admin/settings/organization/labels";
import SettingsOrganizationPageTeam from "@/app/components/admin/settings/organization/team";
import { SubWrapper } from "@/app/components/layout/wrapper";

export default async function SettingsOrgPage() {
	return (
		<SubWrapper title="Labels" description="Create and manage labels to organize your tasks." style="compact">
			<div className="flex flex-col gap-3">
				<SettingsOrganizationLabelsPage />
			</div>
		</SubWrapper>
	);
}
