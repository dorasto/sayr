import { Label } from "@repo/ui/components/label";
import SettingsOrganizationPage from "@/app/components/admin/settings/organization";
import { SubWrapper } from "@/app/components/layout/wrapper";

export default async function SettingsOrgPage() {
	return (
		<SubWrapper title="Organization Settings" style="compact">
			<div className="flex flex-col gap-3">
				<Label variant={"heading"}>General</Label>

				<SettingsOrganizationPage />
			</div>
		</SubWrapper>
	);
}
