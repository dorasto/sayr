import UserSettings from "@/app/components/admin/settings/root";
import { SubWrapper } from "@/app/components/layout/wrapper";

export default async function Mine() {
	return (
		<SubWrapper title="Preferences" style="compact">
			<UserSettings />
		</SubWrapper>
	);
}
