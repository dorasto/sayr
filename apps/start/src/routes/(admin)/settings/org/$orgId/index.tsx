import { Label } from "@repo/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";
import SettingsOrganizationPage from "@/components/pages/admin/settings/orgId/root";
import Preferences from "@/components/pages/admin/settings/orgId/root/preferences";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="max-w-prose mx-auto p-3 md:p-6 w-full flex flex-col gap-9">
      <div className="flex flex-col">
        <Label variant="heading" className="text-2xl text-foreground">
          Organization Settings
        </Label>
      </div>
      <div className="flex flex-col gap-3">
        <Label variant={"heading"}>General</Label>

        <SettingsOrganizationPage />
      </div>
      <div className="flex flex-col gap-3">
        <Label variant={"heading"}>Preferences</Label>
        <Preferences />
      </div>
    </div>
  );
}
