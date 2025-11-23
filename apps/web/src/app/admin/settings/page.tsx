import UserSettings from "@/app/components/admin/settings/root";
import { SubWrapper } from "@/app/components/layout/wrapper";

export default async function Mine() {
	return (
		<SubWrapper title="Settings" style="compact">
			<UserSettings />
		</SubWrapper>
	);
}
