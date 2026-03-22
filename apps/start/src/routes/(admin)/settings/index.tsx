import { Label } from "@repo/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";
import UserSettings, {
  UserPreferences,
} from "@/components/pages/admin/settings";
import { SubWrapper } from "@/components/generic/wrapper";
import {
  Tile,
  TileAction,
  TileDescription,
  TileHeader,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Button } from "@repo/ui/components/button";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useState } from "react";
import { requestDataExport } from "@/lib/fetches/user";
import { seo } from "@/seo";

export const Route = createFileRoute("/(admin)/settings/")({
  head: () => ({ meta: seo({ title: "Settings" }) }),
  component: RouteComponent,
});

function DataExport() {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const result = await requestDataExport();
      if (result.success) {
        headlessToast.success({
          title: "Export requested",
          description:
            "We'll email you a download link when your export is ready.",
        });
      } else {
        headlessToast.error({
          title: result.error || "Failed to request data export",
        });
      }
    } catch {
      headlessToast.error({ title: "Failed to request data export" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="">
      <Tile className="md:w-full border border-primary bg-primary/10">
        <TileHeader>
          <TileTitle>Export your data</TileTitle>
          <TileDescription className="text-xs">
            Download a copy of all your personal data. We'll send you an email
            with a one-time download link when it's ready.
          </TileDescription>
        </TileHeader>
        <TileAction>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExport}
            disabled={isLoading}
            className="bg-primary/50 hover:bg-primary/80 text-primary-foreground border-0"
          >
            {isLoading ? "Requesting..." : "Request export"}
          </Button>
        </TileAction>
      </Tile>
    </div>
  );
}

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
