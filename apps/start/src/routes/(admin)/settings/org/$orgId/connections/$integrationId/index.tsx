import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { seo } from "@/seo";
import { SubWrapper } from "@/components/generic/wrapper";
import { IntegrationPage } from "@repo/integrations/ui/renderer";
import { useState, useCallback } from "react";
import { useToastAction } from "@/lib/util";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import RenderIcon from "@/components/generic/RenderIcon";

export const Route = createFileRoute(
  "/(admin)/settings/org/$orgId/connections/$integrationId/",
)({
  head: () => ({
    meta: seo({ title: "Integration · Connections · Settings" }),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { orgId, integrationId } = Route.useParams() as {
    orgId: string;
    integrationId: string;
  };

  const base =
    import.meta.env.VITE_APP_ENV === "development"
      ? "/backend-api/internal"
      : "/api/internal";

  const [activePage, setActivePage] = useState("settings");
  const { runWithToast } = useToastAction();

  const { data: pagesData, isLoading } = useQuery({
    queryKey: ["integrations", integrationId, "pages"],
    queryFn: async () => {
      const res = await fetch(
        `${base}/v1/admin/integrations/ui/${integrationId}/pages`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const pages = pagesData?.data?.pages || {};
  const integrationName = pagesData?.data?.name || integrationId;
  const integrationIcon = pagesData?.data?.icon as string | undefined;
  const pageKeys = Object.keys(pages);

  const handleSaveWithToast = useCallback(
    async (doFetch: () => Promise<Response>) => {
      await runWithToast(
        `integration-save-${integrationId}`,
        {
          loading: { title: "Saving…" },
          success: { title: "Saved" },
          error: {
            title: "Save failed",
            description: "Could not save settings.",
          },
        },
        async () => {
          const res = await doFetch();
          if (res.ok) {
            return { success: true };
          }
          let errorMsg: string | undefined;
          try {
            const json = await res.json();
            errorMsg = json?.error;
          } catch {}
          return { success: false, error: errorMsg };
        },
      );
    },
    [runWithToast, integrationId],
  );

  return (
    <SubWrapper
      title={integrationName}
      description={`Configure ${integrationName} integration`}
      style="compact"
      icon={
        integrationIcon ? (
          <RenderIcon iconName={integrationIcon} size={24} raw />
        ) : undefined
      }
    >
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="flex flex-col gap-4">
          {pageKeys.length > 1 && (
            <Tabs value={activePage} onValueChange={setActivePage}>
              <TabsList>
                {pageKeys.map((pageKey) => (
                  <TabsTrigger
                    key={pageKey}
                    value={pageKey}
                    className="capitalize"
                  >
                    {pages[pageKey]?.title || pageKey}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          <IntegrationPage
            integrationId={integrationId}
            pageName={activePage}
            orgId={orgId}
            pageConfig={pages[activePage]}
            onSaveWithToast={handleSaveWithToast}
          />
        </div>
      )}
    </SubWrapper>
  );
}
