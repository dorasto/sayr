import { getOrganizationPublic, getReleases } from "@repo/database";
import { getEditionCapabilities } from "@repo/edition";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { SubWrapper } from "@/components/generic/wrapper";
import { ReleasesChangelog } from "@/components/public/releases/releases-changelog";
import { getOgImageUrl, seo } from "@/seo";

const fetchPublicReleases = createServerFn({ method: "GET" })
	.inputValidator((data: { slug: string }) => data)
	.handler(async ({ data }) => {
		// Resolve system org for single-tenant installs
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
		if (!org?.settings?.enablePublicPage) return { releases: [], org: null };

		const all = await getReleases(org.id);
		// Non-archived first, archived last
		const sorted = [
			...all.filter((r) => r.status !== "archived"),
			...all.filter((r) => r.status === "archived"),
		];
		return { releases: sorted, org: { name: org.name, logo: org.logo } };
	});

export const Route = createFileRoute("/orgs/$orgSlug/releases/")({
	loader: async ({ params, context }) =>
		fetchPublicReleases({
			data: {
				slug:
					(context as { systemSlug?: string | null })?.systemSlug ||
					params.orgSlug,
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
	const { releases } = Route.useLoaderData();
	const params = Route.useParams();
	const orgSlug = params.orgSlug;

	if (releases.length === 0) {
		return (
			<SubWrapper title="Releases" top={false}>
				<p className="text-muted-foreground">No releases yet.</p>
			</SubWrapper>
		);
	}

	return (
		<SubWrapper title="Releases" top={false} className="md:pt-6">
			<ReleasesChangelog releases={releases} orgSlug={orgSlug} />
		</SubWrapper>
	);
}
