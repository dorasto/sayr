import { Label } from "@repo/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";
import UserSettings, {
  UserPreferences,
} from "@/components/pages/admin/settings";
import { SubWrapper } from "@/components/generic/wrapper";

export const Route = createFileRoute("/(admin)/settings/")({
  component: RouteComponent,
});

function RouteComponent() {
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
