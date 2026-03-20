import { PublicTaskContent } from "@/components/public/public-task-content";
import { SubWrapper } from "@/components/generic/wrapper";
import { getOrganizationPublic, getTaskByShortId } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { IconArrowLeft } from "@tabler/icons-react";

const fetchPublicTask = createServerFn({ method: "GET" })
	.inputValidator((data: { slug: string; shortId: number }) => data)
	.handler(async ({ data }) => {
		const organization = await getOrganizationPublic(data.slug);
		if (!organization) return { task: null };
		const task = await getTaskByShortId(organization.id, data.shortId, "public");
		return { task };
	});

export const Route = createFileRoute("/orgs/$orgSlug/$shortId/")({
	loader: async ({ params, context }) => {
		const slug = context?.systemSlug || params.orgSlug;
		return await fetchPublicTask({
			data: {
				slug: slug,
				shortId: Number(params.shortId),
			},
		});
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { task } = Route.useLoaderData();
	const { orgSlug } = Route.useParams();

	if (!task) {
		return (
			<>
				<link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any" />
				<title>Task Not Available</title>

				<div className="via-surface to-surface flex min-h-[60vh] items-center justify-center bg-[conic-gradient(at_bottom_left,var(--tw-gradient-stops))] from-primary">
					<div className="mx-auto max-w-xl text-center text-white">
						<h1 className="text-5xl font-black">Task Not Available</h1>

						<p className="mb-7 mt-3">
							Sorry, this task could not be found or isn't publicly available.
							It may have been removed, or the link is incorrect.
						</p>

						<div className="flex place-content-center items-center gap-3">
							<a href="/">
								<Button className="border-surface-100! text-surface-100 w-full p-4 font-bold">
									Back to organization
								</Button>
							</a>
						</div>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<title>
				#{task.shortId} - {task.title}
			</title>
			{/* Consistent h-11 top bar */}
			<div className="flex items-center h-11 shrink-0 border-b px-3 sticky top-0 z-10 bg-background">
				<Link to={`/orgs/${orgSlug}`}>
					<Button
						variant="ghost"
						className="w-fit text-xs p-1 h-auto rounded-lg"
						size="sm"
					>
						<IconArrowLeft className="size-3!" />
						Back
					</Button>
				</Link>
			</div>
			<SubWrapper top={false}>
				<PublicTaskContent task={task} />
			</SubWrapper>
		</>
	);
}
