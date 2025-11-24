import { Label } from "@repo/ui/components/label";
import SettingsOrganizationPageTeam from "@/app/components/admin/settings/organization/team";
import { SubWrapper } from "@/app/components/layout/wrapper";

export default async function SettingsOrgPage() {
	return (
		<SubWrapper title="Team" style="compact">
			<div className="flex flex-col gap-3">
				<SettingsOrganizationPageTeam />
			</div>
		</SubWrapper>
	);
}
