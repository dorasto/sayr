import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { seo } from "@/seo";
import { SubWrapper } from "@/components/generic/wrapper";
import { IntegrationPage } from "@repo/integrations/ui/renderer";
import { useState, useCallback } from "react";
import { useToastAction } from "@/lib/util";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import RenderIcon from "@/components/generic/RenderIcon";
import { MarkdownContent } from "@/components/generic/MarkdownContent";
import { Label } from "@repo/ui/components/label";
import { Button } from "@repo/ui/components/button";
import { Toggle } from "@repo/ui/components/toggle";
import { IconCircleFilled, IconQuestionMark } from "@tabler/icons-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui/components/sheet";
import { cn } from "@/lib/utils";

const getIntegrationMeta = createServerFn({ method: "GET" })
  .inputValidator((data: { integrationId: string }) => data)
  .handler(async ({ data }) => {
    const API_URL =
      process.env.APP_ENV === "development"
        ? "http://localhost:5468/api/internal"
        : "http://localhost:5468/api/internal";
    try {
      const res = await fetch(
        `${API_URL}/v1/admin/integrations/ui/${data.integrationId}/pages`,
      );
      if (!res.ok) return { name: null };
      const json = await res.json();
      return { name: (json?.data?.name as string) || null };
    } catch {
      return { name: null };
    }
  });

export const Route = createFileRoute(
  "/(admin)/settings/org/$orgId/connections/$integrationId/",
)({
  loader: async ({ params }) => {
    return await getIntegrationMeta({
      data: { integrationId: params.integrationId },
    });
  },
  head: ({ loaderData }) => ({
    meta: seo({
      title: loaderData?.name
        ? `${loaderData.name} · Connections · Settings`
        : "Integration · Connections · Settings",
    }),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { orgId, integrationId } = Route.useParams() as {
    orgId: string;
    integrationId: string;
  };

  const queryClient = useQueryClient();

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

  const { data: listData } = useQuery({
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

  const integrationEnabled: boolean =
    (
      listData?.data as Array<{ id: string; enabled: boolean }> | undefined
    )?.find((i) => i.id === integrationId)?.enabled ?? false;

  const enableMutation = useMutation({
    mutationFn: async (enable: boolean) => {
      const action = enable ? "enable" : "disable";
      const res = await fetch(
        `${base}/v1/admin/integrations/${orgId}/${integrationId}/${action}`,
        { method: "POST", credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["integrations", "list", orgId],
      });
    },
  });

  const pages = pagesData?.data?.pages || {};
  const integrationName = pagesData?.data?.name || integrationId;
  const integrationIcon = pagesData?.data?.icon as string | undefined;
  const integrationDocs = pagesData?.data?.docs as string | null | undefined;
  const integrationAuthorURL = pagesData?.data?.authorUrl || integrationId;
  const integrationVersion = pagesData?.data?.version || null;
  const isSayr = pagesData?.data?.authorName === "Doras Media Ltd";
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
      topContent={
        <div className="flex items-center gap-2">
          <Toggle
            variant="accent"
            pressed={integrationEnabled}
            onPressedChange={(pressed) => enableMutation.mutate(pressed)}
            disabled={enableMutation.isPending}
            className={cn(
              "border-transparent rounded-lg",
              integrationEnabled
                ? "bg-accent"
                : "bg-muted text-muted-foreground",
            )}
          >
            <IconCircleFilled
              size={8}
              className={
                integrationEnabled ? "text-primary" : "text-destructive"
              }
            />
            {integrationEnabled ? "Enabled" : "Disabled"}
          </Toggle>
          {integrationDocs && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="primary" size="icon">
                  <IconQuestionMark />
                </Button>
              </SheetTrigger>
              <SheetContent
                className="flex flex-col p-0 overflow-hidden gap-0 md:max-w-1/3"
                showClose={false}
              >
                <SheetHeader className="shrink-0 bg-card p-3 rounded-xl">
                  <SheetTitle asChild>
                    <div className="flex items-center gap-2">
                      <RenderIcon
                        iconName={integrationIcon || "IconPlug"}
                        size={24}
                        raw
                      />
                      <Label variant="heading">{integrationName}</Label>
                    </div>
                  </SheetTitle>
                  <SheetDescription asChild>
                    <div className="flex flex-row gap-3 w-full justify-between">
                      <Label variant="subheading">
                        Created by{" "}
                        <a
                          href={integrationAuthorURL}
                          className="hover:underline text-primary"
                        >
                          {isSayr ? "Sayr" : pagesData?.data?.authorName}
                        </a>
                      </Label>
                      <Label variant="subheading">
                        <a
                          href={
                            `https://github.com/dorasto/sayr/tree/main/integrations/services/` +
                            integrationId
                          }
                          className="hover:underline text-primary"
                        >
                          Version v{integrationVersion}
                        </a>
                      </Label>
                    </div>
                  </SheetDescription>
                </SheetHeader>
                <div className="flex-1 min-h-0 overflow-y-auto p-4">
                  <MarkdownContent content={integrationDocs} />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
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
