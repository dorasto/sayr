import type { schema } from "@repo/database";
import { getLabels, getTasksByUserId } from "@repo/database";
import { redirect } from "next/navigation";
import type React from "react";
import { getAccess } from "@/app/lib/serverFunctions";
import { RootProviderMyTasks } from "./Context";

export default async function MyTasksLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const { account } = await getAccess();

	if (!account) {
		return redirect("/admin");
	}

	// Fetch all tasks assigned to the current user
	const tasks = await getTasksByUserId(account.id);

	// Get unique organization IDs from tasks
	const organizationIds = Array.from(new Set(tasks.map((task) => task.organizationId)));

	// Fetch labels for all organizations the user has tasks in
	const labelsPromises = organizationIds.map((orgId) => getLabels(orgId));
	const labelsArrays = await Promise.all(labelsPromises);
	const allLabels: schema.labelType[] = labelsArrays.flat();

	return (
		<RootProviderMyTasks tasks={tasks} labels={allLabels}>
			{children}
		</RootProviderMyTasks>
	);
}
