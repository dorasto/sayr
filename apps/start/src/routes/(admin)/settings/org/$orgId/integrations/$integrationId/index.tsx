import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { seo } from "@/seo";
import { SubWrapper } from "@/components/generic/wrapper";
import { IntegrationPage } from "@repo/integrations/ui/renderer";
import { useState } from "react";

export const Route = createFileRoute(
  "/(admin)/settings/org/$orgId/integrations/$integrationId/",
)({
  head: () => ({ meta: seo({ title: "Integration · Settings" }) }),
  component: RouteComponent,
});

function RouteComponent() {
  const { orgId, integrationId } = Route.useParams() as { orgId: string; integrationId: string };

  const base =
    import.meta.env.VITE_APP_ENV === "development"
      ? "/backend-api/internal"
      : "/api/internal";

  const [activePage, setActivePage] = useState("settings");

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
  const pageKeys = Object.keys(pages);

  return (
    <SubWrapper
      title={integrationName}
      description={`Configure ${integrationName} integration`}
      style="compact"
    >
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="flex flex-col gap-4">
          {pageKeys.length > 1 && (
            <div className="flex border-b">
              {pageKeys.map((pageKey) => (
                <button
                  key={pageKey}
                  onClick={() => setActivePage(pageKey)}
                  className={`px-4 py-2 -mb-px border-b-2 capitalize ${activePage === pageKey
                    ? "border-primary"
                    : "border-transparent text-muted-foreground"
                    }`}
                >
                  {pages[pageKey]?.title || pageKey}
                </button>
              ))}
            </div>
          )}

          <IntegrationPage
            integrationId={integrationId}
            pageName={activePage}
            orgId={orgId}
            pageConfig={pages[activePage]}
          />
        </div>
      )}
    </SubWrapper>
  );
}
