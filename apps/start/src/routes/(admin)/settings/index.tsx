import { Label } from "@repo/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";
import UserSettings, {
  UserPreferences,
} from "@/components/pages/admin/settings";
import { SubWrapper } from "@/components/generic/wrapper";
import { DataExport } from "@/components/settings/sections/data-export";
import { seo } from "@/seo";

export const Route = createFileRoute("/(admin)/settings/")({
  head: () => ({ meta: seo({ title: "Settings" }) }),
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
      <div className="flex flex-col gap-3">
        <Label variant={"heading"}>Privacy</Label>
        <DataExport />
      </div>
    </SubWrapper>
  );
}
