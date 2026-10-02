import { getOrganizationPublic } from "@repo/database";
import { getEditionCapabilities } from "@repo/edition";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { ActivityPage } from "@/components/public/portal/activity/ActivityPage";
import { getOgImageUrl, seo } from "@/seo";

const fetchPublicOrgMeta = createServerFn({ method: "GET" })
	.inputValidator((data: { slug: string }) => data)
	.handler(async ({ data }) => {
		const { multiTenantEnabled } = getEditionCapabilities();
		let resolvedSlug = data.slug;

		if (!multiTenantEnabled) {
			const { db } = await import("@repo/database");
			const systemOrg = await db.query.organization.findFirst({
				where: (o, { eq }) => eq(o.isSystemOrg, true),
				columns: { slug: true },
			});
			if (systemOrg?.slug) resolvedSlug = systemOrg.slug;
		}

		const org = await getOrganizationPublic(resolvedSlug);
		if (!org?.settings?.enablePublicPage) return { org: null, resolvedSlug };

		return { org: { name: org.name, logo: org.logo }, resolvedSlug };
	});

export const Route = createFileRoute("/orgs/$orgSlug/activity/")({
	loader: async ({ params, context }) =>
		fetchPublicOrgMeta({
			data: {
				slug: (context as { systemSlug?: string | null })?.systemSlug || params.orgSlug,
			},
		}),
	head: ({ loaderData }) => ({
		meta: [
			...seo({
				title: `Your activity${loaderData?.org?.name ? ` · ${loaderData.org.name}` : ""}`,
				description: "The posts you have voted on and posted.",
				image: getOgImageUrl({
					type: "simple",
					logo: loaderData?.org?.logo || undefined,
					title: loaderData?.org?.name || undefined,
					subtitle: "Your activity",
				}),
			}),
			// Personal page: nothing here is worth indexing.
			{ name: "robots", content: "noindex" },
		],
	}),
	component: ActivityPage,
});
