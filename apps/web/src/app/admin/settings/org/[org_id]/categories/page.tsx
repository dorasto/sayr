import { Label } from "@repo/ui/components/label";
import SettingsOrganizationCategoriesPage from "@/app/components/admin/settings/organization/categories";
import SettingsOrganizationPageTeam from "@/app/components/admin/settings/organization/team";
import { SubWrapper } from "@/app/components/layout/wrapper";

export default async function SettingsOrgPage() {
	return (
		<SubWrapper
			title="Categories"
			description="Categories help you organize your tasks into groups for better management and delegation"
			style="compact"
		>
			<div className="flex flex-col gap-3">
				<SettingsOrganizationCategoriesPage />
			</div>
		</SubWrapper>
	);
}
