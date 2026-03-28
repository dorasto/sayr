import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { seo } from "@/seo";
import { SubWrapper } from "@/components/generic/wrapper";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Switch } from "@repo/ui/components/switch";
import { Settings2 } from "lucide-react";

export const Route = createFileRoute(
  "/(admin)/settings/org/$orgId/integrations/",
)({
  head: () => ({ meta: seo({ title: "Integrations · Settings" }) }),
  component: RouteComponent,
});

function RouteComponent() {
  const { orgId } = Route.useParams();
  const queryClient = useQueryClient();

  const base =
    import.meta.env.VITE_APP_ENV === "development"
      ? "/backend-api/internal"
      : "/api/internal";

  const { data: integrationsData, isLoading } = useQuery({
    queryKey: ["integrations", "list", orgId],
    queryFn: async () => {
      const res = await fetch(
        `${base}/v1/admin/integrations/list?orgId=${orgId}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const enableMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const action = enabled ? "enable" : "disable";
      const res = await fetch(
        `${base}/v1/admin/integrations/${orgId}/${id}/${action}`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "list", orgId] });
    },
  });

  const handleToggle = (id: string, currentEnabled: boolean) => {
    enableMutation.mutate({ id, enabled: !currentEnabled });
  };

  return (
    <SubWrapper
      title="Integrations"
      description="Connect your organization with external services"
      style="compact"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrationsData?.data?.map((integration: { id: string; name: string; description: string; pages: string[]; enabled: boolean }) => (
            <Card key={integration.id} className={integration.enabled ? "border-primary/50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-lg font-semibold">{integration.name.charAt(0)}</span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <Badge variant={integration.enabled ? "default" : "secondary"} className="mt-1">
                        {integration.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <CardDescription>{integration.description}</CardDescription>
              </CardContent>
              <Switch
                checked={integration.enabled}
                onCheckedChange={() => handleToggle(integration.id, integration.enabled)}
                disabled={enableMutation.isPending}
              />
              <CardFooter className="pt-0 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!integration.enabled}
                  asChild={integration.enabled}
                >
                  {integration.enabled ? (
                    <Link
                      to="/settings/org/$orgId/integrations/$integrationId"
                      params={{ orgId, integrationId: integration.id }}
                    >
                      <Settings2 className="w-4 h-4 mr-2" />
                      Configure
                    </Link>
                  ) : (
                    <span>
                      <Settings2 className="w-4 h-4 mr-2" />
                      Configure
                    </span>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
          {(integrationsData?.data?.length ?? 0) === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No integrations available
            </div>
          )}
        </div>
      )}
    </SubWrapper>
  );
}
