import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { RootProviderMyTasks } from "@/contexts/ContextMine";

import type { schema } from "@repo/database";
import { db, getLabels, getTasksByUserId } from "@repo/database";
import { createServerFn } from "@tanstack/react-start";
import { inArray } from "drizzle-orm";

export const getMyTasks = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType }) => data)
	.handler(async ({ data }) => {
		try {
			const tasks = await getTasksByUserId(data.account.id);
			const organizationIds = Array.from(new Set(tasks.map((task) => task.organizationId)));
			const labelsPromises = organizationIds.map((orgId) => getLabels(orgId));
			const labelsArrays = await Promise.all(labelsPromises);
			const allLabels: schema.labelType[] = labelsArrays.flat();
			const views = await db.query.savedView.findMany({
				where: (view) => inArray(view.organizationId, organizationIds),
			})
			const categories = await db.query.category.findMany({
				where: (category) => inArray(category.organizationId, organizationIds),
			})
			return { tasks, labels: allLabels, views, categories };
		} catch (error) {
			// If it's already a redirect, re-throw it
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			throw redirect({ to: "/" });
		}
	});

export const Route = createFileRoute("/(admin)/mine")({
	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/login" });
		}
		return await getMyTasks({ data: { account: context.account } });
	},
	component: MineLayout,
});

function MineLayout() {
	const { tasks, labels, views, categories } = Route.useLoaderData();
	return (
		<RootProviderMyTasks tasks={tasks} labels={labels} views={views} categories={categories}>
			<Outlet />
		</RootProviderMyTasks>
	)
}
