import type { schema } from "@repo/database";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { inArray } from "drizzle-orm";

export const getMyTasks = createServerFn({ method: "GET" }).handler(async () => {
	const { getAccess } = await import("@/lib/serverFunctions/getAccess");
	const { db, getTasksByUserId, getLabels } = await import("@repo/database");
	try {
		const { account } = await getAccess();
		const tasks = await getTasksByUserId(account.id);
		const organizationIds = Array.from(new Set(tasks.map((task) => task.organizationId)));
		const labelsPromises = organizationIds.map((orgId) => getLabels(orgId));
		const labelsArrays = await Promise.all(labelsPromises);
		const allLabels: schema.labelType[] = labelsArrays.flat();
		const views = await db.query.savedView.findMany({
			where: (view) => inArray(view.organizationId, organizationIds),
		});
		const categories = await db.query.category.findMany({
			where: (category) => inArray(category.organizationId, organizationIds),
		});
		return { tasks, labels: allLabels, views, categories };
	} catch (error) {
		// If it's already a redirect, re-throw it
		if (error && typeof error === "object" && "redirect" in error) {
			throw error;
		}
		throw redirect({ to: "/admin" });
	}
});
