import { getOrganizationPublic } from "@repo/database";
import { getEditionCapabilities } from "@repo/edition";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { RoadmapPage } from "@/components/public/portal/roadmap/RoadmapPage";
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

export const Route = createFileRoute("/orgs/$orgSlug/roadmap/")({
	loader: async ({ params, context }) =>
		fetchPublicOrgMeta({
			data: {
				slug: (context as { systemSlug?: string | null })?.systemSlug || params.orgSlug,
			},
		}),
	head: ({ loaderData }) => ({
		meta: seo({
			title: `Roadmap${loaderData?.org?.name ? ` · ${loaderData.org.name}` : ""}`,
			description: "What the team is planning, building and has just shipped.",
			image: getOgImageUrl({
				type: "simple",
				logo: loaderData?.org?.logo || undefined,
				title: loaderData?.org?.name || undefined,
				subtitle: "Roadmap",
			}),
		}),
	}),
	component: RoadmapPage,
});
