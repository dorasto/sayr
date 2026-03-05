import { SubWrapper } from "@/components/generic/wrapper";
import { PublicOrganizationProvider } from "@/contexts/publicContextOrg";
import { db, getLabels, getOrganizationPublic } from "@repo/database";
import { getEditionCapabilities } from "@repo/edition";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

let cachedSystemOrgSlug: string | null | undefined = undefined;
let lastFetch = 0;

const TTL = 1000 * 60 * 60; // 1 hour

async function getSystemOrgSlug() {
	const now = Date.now();

	if (
		cachedSystemOrgSlug !== undefined &&
		now - lastFetch < TTL
	) {
		return cachedSystemOrgSlug;
	}

	const org = await db.query.organization.findFirst({
		where: (o, { eq }) => eq(o.isSystemOrg, true),
		columns: { slug: true },
	});

	if (!org?.slug) {
		// Do NOT cache failures
		return null;
	}

	cachedSystemOrgSlug = org.slug;
	lastFetch = now;

	return cachedSystemOrgSlug;
}

async function resolvePublicOrganization(slug: string) {
	const { multiTenantEnabled } = getEditionCapabilities();

	if (!multiTenantEnabled) {
		const systemSlug = await getSystemOrgSlug();
		if (!systemSlug) return null;

		return getOrganizationPublic(systemSlug);
	}

	return getOrganizationPublic(slug);
}

const fetchPublicOrganizationAndTasks = createServerFn({ method: "GET" })
	.inputValidator((data: { slug: string }) => data)
	.handler(async ({ data }) => {
		const organization = await resolvePublicOrganization(data.slug);

		if (!organization) {
			return { organization: null, labels: [], categories: [] };
		}

		const [labels, categories] = await Promise.all([
			getLabels(organization.id, "public"),
			db.query.category.findMany({
				where: (c, { eq }) => eq(c.organizationId, organization.id),
			}),
		]);

		return { organization, labels, categories };
	});

export const Route = createFileRoute("/orgs/$orgSlug")({
	loader: async ({ params }) =>
		fetchPublicOrganizationAndTasks({
			data: { slug: params.orgSlug },
		}),

	pendingComponent: PublicLayoutPending,

	head: ({ loaderData }) => {
		if (!loaderData?.organization?.settings?.enablePublicPage) {
			return {
				meta: [{ title: "Organization Not Available" }],
				links: [
					{
						rel: "icon",
						href: "/icon.svg",
						type: "image/svg+xml",
					},
				],
			};
		}

		return {
			meta: [
				{
					title: `${loaderData.organization.name} | Sayr.io`,
				},
			],
		};
	},

	component: PublicLayout,
});

function PublicLayout() {
	const { organization, labels, categories } = Route.useLoaderData();

	if (!organization?.settings?.enablePublicPage) {
		return <OrganizationUnavailable />;
	}

	return (
		<PublicOrganizationProvider
			organization={organization}
			labels={labels}
			categories={categories}
		>
			<div className="relative flex h-dvh flex-col overflow-hidden">
				<div className="relative min-h-0 flex-1 overflow-y-auto">
					<SubWrapper
						className="relative mx-auto max-w-6xl p-4!"
						blur={false}
						top={false}
					>
						<Outlet />
					</SubWrapper>
				</div>
			</div>
		</PublicOrganizationProvider>
	);
}

function OrganizationUnavailable() {
	return (
		<div className="via-surface to-surface flex h-screen items-center bg-[conic-gradient(at_bottom_left,var(--tw-gradient-stops))] from-primary">
			<div className="mx-auto max-w-xl text-center text-white">
				<h1 className="text-5xl font-black">
					Organization Not Available
				</h1>

				<p className="mb-7 mt-3">
					Sorry, this organization could not be found or isn’t available right
					now. It might have been removed or the link is incorrect.
				</p>

				<div className="flex items-center justify-center gap-3">
					<a href="/">
						<Button className="border-surface-100! text-surface-100 w-full p-4 font-bold">
							Back home
						</Button>
					</a>

					<a href="https://doras.to/discord">
						<Button className="border-surface-100! text-surface-100 flex w-full gap-2 p-4 font-bold">
							Report an issue
						</Button>
					</a>
				</div>
			</div>
		</div>
	);
}

function PublicLayoutPending() {
	return (
		<div className="relative flex h-dvh flex-col overflow-hidden">
			<div className="relative min-h-0 flex-1 overflow-y-auto">
				<SubWrapper
					className="relative mx-auto max-w-6xl p-4!"
					blur={false}
					top={false}
				>
					<div className="space-y-4">
						<Skeleton className="h-48 w-full rounded-lg" />

						<div className="flex items-center gap-4">
							<Skeleton className="h-16 w-16 rounded-full" />
							<div className="space-y-2">
								<Skeleton className="h-8 w-48" />
								<Skeleton className="h-4 w-32" />
							</div>
						</div>

						<div className="mt-8 space-y-4">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</div>
					</div>
				</SubWrapper>
			</div>
		</div>
	);
}