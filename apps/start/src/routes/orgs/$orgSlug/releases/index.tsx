import { getOrganizationPublic } from "@repo/database";
import { getEditionCapabilities } from "@repo/edition";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { ReleasesChangelog } from "@/components/public/releases/releases-changelog";
import { type ChangelogTab, parseChangelogTab } from "@/lib/portal/changelog";
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
	// `?tab=upcoming|released`; All is the default and stays out of the URL.
	validateSearch: (search: Record<string, unknown>): { tab?: ChangelogTab } => {
		const tab = parseChangelogTab(search.tab);
		return tab === "all" ? {} : { tab };
	},
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
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const orgSlug = params.orgSlug;

	return (
		<ReleasesChangelog
			orgSlug={orgSlug}
			tab={parseChangelogTab(search.tab)}
			onTabChange={(tab) => navigate({ search: tab === "all" ? {} : { tab }, replace: true })}
		/>
	);
}
