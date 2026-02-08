import { PublicTaskContent } from "@/components/public/public-task-content";
import { getOrganizationPublic, getTaskByShortId } from "@repo/database";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const fetchPublicTask = createServerFn({ method: "GET" })
	.inputValidator((data: { slug: string; shortId: number }) => data)
	.handler(async ({ data }) => {
		const organization = await getOrganizationPublic(data.slug);
		if (!organization) return { task: null };
		const task = await getTaskByShortId(organization.id, data.shortId, "public");
		return { task };
	});

export const Route = createFileRoute("/orgs/$orgSlug/$shortId/")({
	loader: async ({ params }) => {
		return await fetchPublicTask({
			data: {
				slug: params.orgSlug,
				shortId: Number(params.shortId),
			},
		});
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { task } = Route.useLoaderData();

	if (!task) {
		return (
			<div className="flex flex-col items-center justify-center py-24 text-center">
				<h1 className="text-2xl font-bold">Task not found</h1>
				<p className="text-muted-foreground mt-2">
					This task doesn't exist or isn't publicly available.
				</p>
			</div>
		);
	}

	return (
		<>
			<title>
				#{task.shortId} - {task.title}
			</title>
			<PublicTaskContent task={task} />
		</>
	);
}
