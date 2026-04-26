import { getOrganizationPublic } from "@repo/database";
import { getEditionCapabilities } from "@repo/edition";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { ReleasesChangelog } from "@/components/public/releases/releases-changelog";
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

export const Route = createFileRoute("/orgs/$orgSlug/releases/")({
	loader: async ({ params, context }) =>
		fetchPublicOrgMeta({
			data: {
				slug: (context as { systemSlug?: string | null })?.systemSlug || params.orgSlug,
			},
		}),
	head: ({ loaderData }) => ({
		meta: seo({
			title: `Releases${loaderData?.org?.name ? ` · ${loaderData.org.name}` : ""}`,
			image: getOgImageUrl({
				type: "simple",
				logo: loaderData?.org?.logo || undefined,
				title: loaderData?.org?.name || undefined,
				subtitle: "Releases",
			}),
		}),
	}),
	component: ReleasesListPage,
});

function ReleasesListPage() {
	const params = Route.useParams();
	const orgSlug = params.orgSlug;

	return <ReleasesChangelog orgSlug={orgSlug} />;
}
