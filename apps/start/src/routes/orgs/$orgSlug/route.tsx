import { SubWrapper } from "@/components/generic/wrapper";
import { PublicOrganizationProvider } from "@/contexts/publicContextOrg";
import { db, getLabels, getOrganizationPublic } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const fetchPublicOrganizationAndTasks = createServerFn({ method: "GET" })
	.inputValidator((data: { slug: string }) => data)
	.handler(async ({ data }) => {
		const organization = await getOrganizationPublic(data.slug);
		if (!organization) return { organization: null, labels: [], categories: [] };
		const [labels, categories] = await Promise.all([
			getLabels(organization.id, "public"),
			db.query.category.findMany({
				where: (c, { eq }) => eq(c.organizationId, organization.id),
			}),
		]);
		return { organization, labels, categories };
	});

// Loading component shown during SSR and while data loads
function PublicLayoutPending() {
	return (
		<div className="flex h-dvh flex-col overflow-hidden relative">
			<div className="min-h-0 flex-1 overflow-y-auto relative">
				<SubWrapper className="max-w-6xl mx-auto relative p-4!" blur={false} top={false}>
					{/* Header skeleton */}
					<div className="space-y-4">
						<Skeleton className="h-48 w-full rounded-lg" />
						<div className="flex items-center gap-4">
							<Skeleton className="h-16 w-16 rounded-full" />
							<div className="space-y-2">
								<Skeleton className="h-8 w-48" />
								<Skeleton className="h-4 w-32" />
							</div>
						</div>
						{/* Content skeleton */}
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

export const Route = createFileRoute("/orgs/$orgSlug")({
	// Note: We removed the beforeLoad redirect check because the rewrite system
	// already handles routing. The input rewrite only transforms subdomain URLs
	// to /orgs/$slug, so this route only receives valid subdomain requests.
	loader: async ({ params }) => {
		return await fetchPublicOrganizationAndTasks({
			data: {
				slug: params.orgSlug,
			},
		});
	},
	pendingComponent: PublicLayoutPending,
	component: PublicLayout,
});

function PublicLayout() {
	const { organization, labels, categories } = Route.useLoaderData();
	if (!organization) {
		return (
			<>
				<link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any" />
				<title>Organization Not Available</title>
				<div className="via-surface to-surface flex h-screen items-center bg-[conic-gradient(at_bottom_left,var(--tw-gradient-stops))] from-primary">
					<div className="mx-auto max-w-xl text-center text-white">
						<h1 className="text-5xl font-black">Organization Not Available</h1>
						<p className="mb-7 mt-3">
							Sorry, this organization could not be found or isn’t available right now. It might have been
							removed or the link is incorrect.
						</p>
						<div className="flex place-content-center items-center gap-3">
							<a href="/">
								<Button className="border-surface-100! text-surface-100 w-full p-4 font-bold">Back home</Button>
							</a>
							<a href="https://doras.to/discord">
								<Button className="border-surface-100! text-surface-100 flex w-full gap-2 p-4 font-bold">
									Report an issue
								</Button>
							</a>
						</div>
					</div>
				</div>
			</>
		);
	}
	return (
		<PublicOrganizationProvider organization={organization} labels={labels} categories={categories}>
			<div className="flex h-dvh flex-col overflow-hidden relative">
				<div className="min-h-0 flex-1 overflow-y-auto relative">
					<SubWrapper className="max-w-6xl mx-auto relative p-4!" blur={false} top={false}>
						<Outlet />
					</SubWrapper>
				</div>
			</div>
		</PublicOrganizationProvider>
	);
}
