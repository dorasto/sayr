import { SubWrapper } from "@/components/generic/wrapper";
import OrganizationReleasesPage from "@/components/pages/admin/orgid/releases";
import { IconRocket } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/$orgId/releases/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <SubWrapper
      style="compact"
      title="Releases"
      icon={<IconRocket />}
      description="Manage product releases and milestones"
    >
      <OrganizationReleasesPage />
    </SubWrapper>
  );
}
