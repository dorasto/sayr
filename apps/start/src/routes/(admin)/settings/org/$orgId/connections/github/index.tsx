import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import SettingsOrganizationConnectionsGitHubPage, { type githubConnections, type githubConnectionsRepositories } from "@/components/pages/admin/settings/orgId/connections/github";

export const Route = createFileRoute(
  '/(admin)/settings/org/$orgId/connections/github/',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { orgId } = Route.useParams();
  const { data: githubData } = useQuery({
    queryKey: ["organization", orgId, "connections", "github"],
    queryFn: async () => {
      const base =
        import.meta.env.VITE_APP_ENV === "development"
          ? "/backend-api/internal"
          : "/api/internal";

      const res = await fetch(
        `${base}/v1/admin/organization/${orgId}/connections/github`,
        { credentials: "include" }
      );

      if (!res.ok) throw new Error("Failed to fetch");

      return res.json();
    },
  });
  // ✅ Now an array
  const githubConnections: githubConnections =
    githubData?.data?.githubConnections ?? [];
  const githubConnectionsRepositories: githubConnectionsRepositories =
    githubData?.data?.repositories ?? [];
  const appName = import.meta.env.VITE_GITHUB_APP_NAME;

  return (
    <div className="max-w-prose mx-auto p-3 md:p-6 w-full flex flex-col gap-9">
      <div className="flex flex-col">
        <Label variant="heading" className="text-2xl text-foreground">GitHub</Label>
        <Label variant="subheading" className="text-muted-foreground">Connect your organization to GitHub repositories</Label>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <Label variant="heading">
              GitHub connections
            </Label>
            <Label variant="description">
              Link your GitHub organizations and
              repositories to your Sayr
              organization.
            </Label>
          </div>
          <a
            href={`https://github.com/apps/${appName}/installations/new?state=org_${orgId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="ghost"
              size="icon"
            >
              <IconPlus />
            </Button>
          </a>
        </div>
        <SettingsOrganizationConnectionsGitHubPage
          githubConnections={githubConnections}
          repositories={githubConnectionsRepositories}
          isLoading={!githubData?.data}
        />
      </div>
    </div>

  )
}
