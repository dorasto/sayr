import { createFileRoute, redirect } from "@tanstack/react-router";
import { getReleaseBySlug, type schema } from "@repo/database";
import { createServerFn } from "@tanstack/react-start";
import { seo } from "@/seo";
import ReleaseDetailPage from "@/components/pages/admin/orgid/releases/releaseSlug";

export const getAdminOrganizationRelease = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType; orgId: string; releaseSlug: string }) => data)
	.handler(async ({ data }) => {
		const { orgId, releaseSlug } = data;
		try {
			if (!orgId || !releaseSlug) {
				throw redirect({ to: "/" });
			}
			const release = await getReleaseBySlug(orgId, releaseSlug);
			if (!release) {
				throw redirect({ to: `/${orgId}/settings/org/${orgId}/releases` as string });
			}
			return { release };
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
			throw redirect({ to: "/login" });
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
		}),
	}),
});

function RouteComponent() {
	const { release } = Route.useLoaderData();
	return <ReleaseDetailPage release={release} />;
}
