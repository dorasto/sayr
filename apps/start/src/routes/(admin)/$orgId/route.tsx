import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { RootProviderOrganization } from "@/contexts/ContextOrg";
import { getAdminOrganization } from "@/lib/serverFunctions/getAdminOrganization";
import { createServerFn } from "@tanstack/react-start";
import { getOrgPermissions, type schema } from "@repo/database";
import { seo } from "@/seo";
import { IconLoader2 } from "@tabler/icons-react";
import { SentryOrgContext } from "@/components/sentry-user-sync";

/**
 * Fetches all merged organization-level permissions for a user.
 *
 * Input: { account, orgId }
 * Output: { permissions }
 */
export const getUserOrgPermissions = createServerFn({ method: "GET" })
  .inputValidator((data: { account: schema.userType; orgId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const permissions = await getOrgPermissions(data.account.id, data.orgId);
      return {
        account: data.account,
        orgId: data.orgId,
        permissions,
      };
    } catch (error) {
      console.error("Error fetching org permissions:", error);
      if (error && typeof error === "object" && "redirect" in error) {
        throw error;
      }
      throw redirect({ to: "/login" });
    }
  });
/**
 * Route configuration
 */
export const Route = createFileRoute("/(admin)/$orgId")({
  beforeLoad: async ({ params, context }) => {
    const { account } = context;
    if (!account) {
      throw redirect({ to: "/login" });
    }
    const { permissions } = await getUserOrgPermissions({
      data: {
        account,
        orgId: params.orgId,
      },
    });
    return { permissions };
  },
  loader: async ({ params, context }) => {
    const { account } = context;
    if (!account) throw redirect({ to: "/login" });
    return await getAdminOrganization({
      data: {
        account,
        orgId: params.orgId,
      },
    });
  },
  staleTime: 1000 * 60 * 5, // 5 minutes - prevents unnecessary refetching
  component: OrgLayout,
  pendingComponent: OrgLayoutPending,
  head: ({ loaderData }) => ({
    meta: seo({
      title: `${loaderData?.organization.name || "Organization"}`,
    }),
  }),
});

/**
 * Layout that wraps nested admin pages
 */
function OrgLayout() {
  const { organization, labels, views, categories, issueTemplates, releases } =
    Route.useLoaderData();

  return (
    <RootProviderOrganization
      organization={organization}
      labels={labels}
      views={views}
      categories={categories}
      issueTemplates={issueTemplates}
      releases={releases}
    >
      {/* Sync organization context to Sentry for better error tracking */}
      <SentryOrgContext
        orgId={organization.id}
        orgName={organization.name}
        orgSlug={organization.slug}
      />
      <Outlet />
    </RootProviderOrganization>
  );
}

/**
 * Pending component shown while organization data loads
 */
function OrgLayoutPending() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
