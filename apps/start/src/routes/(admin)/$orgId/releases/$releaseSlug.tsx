import { createFileRoute, redirect } from "@tanstack/react-router";
import { getReleaseBySlug, getOrganization, type schema } from "@repo/database";
import { createServerFn } from "@tanstack/react-start";
import { seo, getOgImageUrl } from "@/seo";
import ReleaseDetailPage from "@/components/pages/admin/orgid/releases/release-slug";

export const getAdminOrganizationRelease = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { account: schema.userType; orgId: string; releaseSlug: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    const { account, orgId, releaseSlug } = data;
    try {
      if (!orgId || !releaseSlug) {
        throw redirect({ to: "/" });
      }
      const release = await getReleaseBySlug(orgId, releaseSlug);
      if (!release) {
        throw redirect({
          to: `/${orgId}/settings/org/${orgId}/releases` as string,
        });
      }
      const org = await getOrganization(orgId, account.id);
      return { release, orgName: org?.name || null, orgLogo: org?.logo || null };
    } catch (error) {
      console.error("Error fetching release:", error);
      if (error && typeof error === "object" && "redirect" in error) {
        throw error;
      }
      throw redirect({ to: "/" });
    }
  });

export const Route = createFileRoute("/(admin)/$orgId/releases/$releaseSlug")({
  loader: async ({ params, context }) => {
    if (!context.account) {
      throw redirect({ to: "/auth/login" });
    }
    return await getAdminOrganizationRelease({
      data: {
        account: context.account,
        orgId: params.orgId,
        releaseSlug: params.releaseSlug,
      },
    });
  },
  component: RouteComponent,
  head: ({ loaderData }) => ({
    meta: seo({
      title: loaderData?.release?.name || "Release",
      image: getOgImageUrl({
        title: loaderData?.release?.name || "Release",
        meta: loaderData?.orgName || undefined,
        logo: loaderData?.orgLogo || undefined,
      }),
    }),
  }),
});

function RouteComponent() {
  const { release } = Route.useLoaderData();
  return <ReleaseDetailPage release={release} />;
}
