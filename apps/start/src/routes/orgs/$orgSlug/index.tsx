import { Button } from "@repo/ui/components/button";
import { createServerFn } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { db, getOrganizationPublic, getTasksByOrganizationIdPublic } from "@repo/database";
import PublicOrgHomePage from "@/components/public";
import PublicNavigation from "@/components/public/navigation";
import { PublicOrganizationProvider } from "@/contexts/publicContextOrg";

const fetchPublicOrganizationAndTasks = createServerFn({ method: "GET" })
	.inputValidator((data: { slug: string }) => data)
	.handler(async ({ data }) => {
		const organization = await getOrganizationPublic(data.slug);
		const tasks = await getTasksByOrganizationIdPublic(organization?.id || "")

		return { organization, tasks };
	});

export const Route = createFileRoute("/orgs/$orgSlug/")({
	loader: async ({ params }) => {
		return await fetchPublicOrganizationAndTasks({
			data: {
				slug: params.orgSlug,
			},
		});
	},
	component: OrgDashboard,
});

function OrgDashboard() {
	const { organization, tasks } = Route.useLoaderData();
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
		<PublicOrganizationProvider organization={organization} tasks={tasks}>
			<div className="flex h-dvh flex-col overflow-hidden max-w-7xl mx-auto">
				<PublicNavigation />
				<div className="min-h-0 flex-1 overflow-y-auto p-3">
					<PublicOrgHomePage />
				</div>
			</div>
		</PublicOrganizationProvider>
	);
}
