import { useState } from "react";
import {
  AdaptiveDialog,
  AdaptiveDialogContent,
  AdaptiveDialogHeader,
  AdaptiveDialogTitle,
  AdaptiveDialogBody,
  AdaptiveDialogFooter,
} from "@repo/ui/components/adaptive-dialog";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { IconPlus } from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import SettingsOrganizationConnectionsGitHubPage, {
  type githubConnections,
  type githubConnectionsRepositories,
} from "@/components/pages/admin/settings/orgId/connections/github";

export const Route = createFileRoute(
  "/(admin)/settings/org/$orgId/connections/github/"
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { orgId } = Route.useParams();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const base =
    import.meta.env.VITE_APP_ENV === "development"
      ? "/backend-api/internal"
      : "/api/internal";

  /* ================= EXISTING CONNECTIONS ================= */

  const { data: githubData } = useQuery({
    queryKey: ["organization", orgId, "connections", "github"],
    queryFn: async () => {
      const res = await fetch(
        `${base}/v1/admin/organization/${orgId}/connections/github`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const githubConnections: githubConnections =
    githubData?.data?.githubConnections ?? [];

  const githubConnectionsRepositories: githubConnectionsRepositories =
    githubData?.data?.repositories ?? [];

  /* ================= INSTALLATIONS QUERY ================= */

  const {
    data: installationsData,
    refetch: refetchInstallations,
    isFetching: installationsLoading,
  } = useQuery({
    queryKey: ["github", "installations", orgId],
    queryFn: async () => {
      const res = await fetch(
        `${base}/v1/admin/organization/${orgId}/github/installations`,
        { credentials: "include" }
      );
      // if (!res.ok) throw new Error("Failed to fetch installs");
      return res.json();
    },
    enabled: false, // ✅ only fetch when modal opens
  });

  /* ================= LINK INSTALLATION ================= */

  const linkMutation = useMutation({
    mutationFn: async (installationId: number) => {
      const res = await fetch(
        `${base}/v1/admin/organization/${orgId}/github/link`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ installationId }),
        }
      );
      if (!res.ok) throw new Error("Failed to link");
      return res.json();
    },
    onSuccess: () => {
      setOpen(false);
      queryClient.invalidateQueries({
        queryKey: ["organization", orgId, "connections", "github"],
      });
    },
  });

  const appName = import.meta.env.VITE_GITHUB_APP_NAME;
  const githubAccountNotConnected =
    installationsData?.error &&
    (!installationsData?.data || installationsData.data.length === 0);

  return (
    <div className="max-w-prose mx-auto p-3 md:p-6 w-full flex flex-col gap-9">
      <div className="flex flex-col">
        <Label variant="heading" className="text-2xl text-foreground">
          GitHub
        </Label>
        <Label
          variant="subheading"
          className="text-muted-foreground"
        >
          Connect your organization to GitHub repositories
        </Label>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <Label variant="heading">
              GitHub connections
            </Label>
            <Label variant="description">
              Link your GitHub organizations and repositories
              to your Sayr organization.
            </Label>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              setOpen(true);
              await refetchInstallations();
            }}
          >
            <IconPlus />
          </Button>
        </div>

        <SettingsOrganizationConnectionsGitHubPage
          githubConnections={githubConnections}
          repositories={githubConnectionsRepositories}
          isLoading={!githubData?.data}
        />
      </div>

      {/* ================= INSTALL MODAL ================= */}

      <AdaptiveDialog open={open} onOpenChange={setOpen}>
        <AdaptiveDialogContent size="small">
          <AdaptiveDialogHeader>
            <AdaptiveDialogTitle>Connect GitHub Installation</AdaptiveDialogTitle>
          </AdaptiveDialogHeader>

          <AdaptiveDialogBody>
            {/* ================= BLOCKED: ACCOUNT NOT CONNECTED ================= */}
            {githubAccountNotConnected ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Please connect your GitHub account first.
                </p>

                <a href="/settings/connections">
                  <Button className="w-full">Connect GitHub</Button>
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* ================= LOADING ================= */}
                {installationsLoading && (
                  <p className="text-sm text-muted-foreground">
                    Loading installations...
                  </p>
                )}

                {/* ================= INSTALLATIONS LIST ================= */}
                {installationsData?.data?.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {installationsData.data.map((install: any) => {
                      const isConnected =
                        typeof githubConnections.find(
                          (e) =>
                            e.installation.installationId ===
                            install.id
                        ) === "object";

                      return (
                        <div
                          key={install.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={install.account.avatar_url}
                              alt={install.account.login}
                              className="w-8 h-8 rounded-full"
                            />
                            <div>
                              <p className="text-sm font-medium">
                                {install.account.login}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {install.account.type}
                              </p>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            onClick={() =>
                              linkMutation.mutate(install.id)
                            }
                            disabled={
                              linkMutation.isPending || isConnected
                            }
                          >
                            {isConnected ? "Connected" : "Connect"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ================= INSTALL NEW ACCOUNT ================= */}
                <a
                  href={`https://github.com/apps/${appName}/installations/new?state=org_${orgId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="w-full">
                    Install to another GitHub account
                  </Button>
                </a>
              </div>
            )}
          </AdaptiveDialogBody>

          <AdaptiveDialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </AdaptiveDialogFooter>
        </AdaptiveDialogContent>
      </AdaptiveDialog>
    </div>
  );
}