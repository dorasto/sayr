import { and, eq } from "drizzle-orm";
import { db } from "..";

/**
 * Retrieves all tasks for a given project including their full label information.
 *
 * @param orgId - The ID of the organization.
 * @param projectId - The project ID for which to fetch tasks.
 * @returns An array of tasks, each enriched with their associated labels.
 *
 * NOTE: The returned objects include `labels` as full `label` objects,
 * not join table rows.
 *
 * @example
 * ```ts
 * const tasks = await getTasksByProjectId("org_123", "proj_456");
 * tasks.forEach(task => {
 *   console.log("Task:", task.title);
 *   task.labels.forEach(label =>
 *     console.log(`  Label: ${label.name} - ${label.color}`)
 *   );
 * });
 * ```
 */
export async function getTasksByProjectId(orgId: string, projectId: string) {
	const tasks = await db.query.task.findMany({
		where: (t) => and(eq(t.organizationId, orgId), eq(t.projectId, projectId)),
		with: {
			labels: {
				with: {
					label: true, // 👈 eager load the real label object
				},
			},
			createdBy: {
				columns: {
					id: true,
					name: true,
					image: true,
				},
			},
			assignees: {
				with: {
					user: {
						columns: {
							id: true,
							name: true,
							image: true,
						},
					},
				},
			},
		},
	});

	// 🧹 map join rows into clean labels array
	return tasks.map((task) => ({
		...task,
		labels: task.labels.map((assignment) => assignment.label),
		assignees: task.assignees.map((assignment) => assignment.user),
	}));
}
