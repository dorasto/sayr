import { Label } from "@repo/ui/components/label";
import UserSettings, { UserPreferences } from "@/app/components/admin/settings/root";
import { SubWrapper } from "@/app/components/layout/wrapper";

export default async function Mine() {
	return (
		<SubWrapper title="Settings" style="compact">
			<div className="flex flex-col gap-3">
				<Label variant={"heading"}>General</Label>
				<UserSettings />
			</div>
			<div className="flex flex-col gap-3">
				<Label variant={"heading"}>Preferences</Label>
				<UserPreferences />
			</div>
		</SubWrapper>
	);
}
