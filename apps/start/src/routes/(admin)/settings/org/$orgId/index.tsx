import { Label } from "@repo/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";
import SettingsOrganizationPage from "@/components/pages/admin/settings/orgId/root";
import Preferences from "@/components/pages/admin/settings/orgId/root/preferences";
import { SubWrapper } from "@/components/generic/wrapper";
import Danger from "@/components/pages/admin/settings/orgId/root/danger";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <SubWrapper title="Organization Settings" style="compact">
      <div className="flex flex-col gap-3">
        <Label variant={"heading"}>General</Label>
        <SettingsOrganizationPage />
      </div>
      <div className="flex flex-col gap-3">
        <Label variant={"heading"}>Preferences</Label>
        <Preferences />
      </div>
      <Danger />
    </SubWrapper>
  );
}
