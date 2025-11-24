import SettingsOrganizationConnectionsPage from "@/app/components/admin/settings/organization/connections";
import { SubWrapper } from "@/app/components/layout/wrapper";

export default async function SettingsOrgPage() {
	return (
		<SubWrapper
			title="Connections"
			description="Manage integrations and connections with third-party services."
			style="compact"
		>
			<div className="flex flex-col gap-3">
				<SettingsOrganizationConnectionsPage />
			</div>
		</SubWrapper>
	);
}
