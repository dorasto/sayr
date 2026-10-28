import { createFileRoute, redirect } from "@tanstack/react-router";
import { getReleaseBySlug, getOrganization } from "@repo/database";
import { createServerFn } from "@tanstack/react-start";
import { requireAccount } from "@/getAccess";
import { seo, getOgImageUrl } from "@/seo";
import ReleaseDetailPage from "@/components/pages/admin/orgid/releases/release-slug";

export const getAdminOrganizationRelease = createServerFn({ method: "GET" })
	.validator((data: { orgId: string; releaseSlug: string }) => data)
	.handler(async ({ data }) => {
		const { orgId, releaseSlug } = data;
		// Identity comes from the session, never from client input (server fns are publicly callable).
		const account = await requireAccount();
		try {
			if (!orgId || !releaseSlug) {
				throw redirect({ to: "/" });
			}
			// Membership check before reading the release (same access rule as the parent $orgId layout).
			const org = await getOrganization(orgId, account.id, { blockOrgUnseated: true });
			if (!org) {
				throw redirect({ to: "/" });
			}
			const release = await getReleaseBySlug(orgId, releaseSlug);
			if (!release) {
				throw redirect({
					to: `/${orgId}/settings/org/${orgId}/releases` as string,
				});
			}
			return { release, orgName: org.name || null, orgLogo: org.logo || null };
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
