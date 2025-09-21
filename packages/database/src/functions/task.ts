import { and, eq, sql } from "drizzle-orm";
import { taskTimeline } from "../../schema/taskTimeline.schema";
import { db, schema } from "..";

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
			timeline: {
				with: {
					actor: {
						columns: {
							id: true,
							name: true,
							image: true,
						},
					},
				},
			},
			comments: {
				with: {
					createdBy: {
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

/**
 * Creates a new task in a project, automatically assigning
 * the next available shortId scoped to that project.
 *
 * @param orgId - The organization ID the task belongs to.
 * @param projectId - The project ID the task belongs to.
 * @param createdBy - The user ID who is creating (or null for anonymous).
 * @param data - The task properties (title, description, status, priority).
 * @returns The newly created task row.
 *
 * @example
 * ```ts
 * const task = await createTaskWithShortId(
 *   "org_1",
 *   "proj_123",
 *   user.id,
 *   {
 *     title: "Fix login bug",
 *     description: [],
 *     status: "todo",
 *     priority: "high"
 *   }
 * );
 * console.log(task.shortId); // 1, 2, 3, ...
 * ```
 */
export async function createTask(
	orgId: string,
	projectId: string,
	data: {
		title: string;
		description?: unknown;
		status?: string | null;
		priority?: string | null;
	},
	createdBy?: string | null
) {
	console.log("🚀 ~ createTask ~ createdBy:", createdBy);
	// Get highest existing shortId for this project
	const [max] = (await db
		.select({ max: sql<number>`MAX(${schema.task.shortId})` })
		.from(schema.task)
		.where(eq(schema.task.projectId, projectId))) || [{ max: 0 }];

	const nextShortId = (max?.max ?? 0) + 1;

	// Insert the new task
	const [task] = await db
		.insert(schema.task)
		.values({
			organizationId: orgId,
			projectId: projectId,
			shortId: nextShortId,
			title: data.title,
			description: data.description ?? [],
			status: data.status ?? "todo",
			priority: data.priority ?? "none",
			createdBy: createdBy, // nullable for ANONYMOUS
		})
		.returning();
	return task;
}

/**
 * Logs a timeline event for a task.
 *
 * @param params - taskId, orgId, actorId, eventType, optional from/to values, comment
 */
export async function logTaskEvent({
	timelineNumber,
	taskId,
	organizationId,
	projectId,
	actorId,
	eventType,
	fromValue,
	toValue,
	blockNote,
}: {
	timelineNumber: number;
	taskId: string;
	organizationId: string;
	projectId: string;
	actorId?: string | null;
	eventType: (typeof schema.timelineEventTypeEnum.enumValues)[number];
	fromValue?: unknown;
	toValue?: unknown;
	blockNote?: unknown;
}) {
	await db.insert(taskTimeline).values({
		timelineNumber: timelineNumber,
		taskId: taskId,
		organizationId: organizationId,
		projectId: projectId,
		actorId: actorId ?? null,
		eventType: eventType,
		fromValue: fromValue ? JSON.stringify(fromValue) : null,
		toValue: toValue ? JSON.stringify(toValue) : null,
		blockNote: blockNote ?? null,
	});
}

// helper to append timeline entries
export async function addLogEventTask(
	task_id: string,
	project_id: string,
	org_id: string,
	type: (typeof schema.timelineEventTypeEnum.enumValues)[number],
	fromValue?: unknown,
	toValue?: unknown,
	actorId?: string,
	blockNote?: unknown
) {
	const [timeline] = (await db
		.select({ max: sql<number>`MAX(${schema.taskTimeline.timelineNumber})` })
		.from(schema.taskTimeline)
		.where(eq(schema.taskTimeline.taskId, task_id))) || [{ max: 0 }];
	let nextNum = timeline?.max ?? 0;
	nextNum++;
	await logTaskEvent({
		timelineNumber: nextNum,
		taskId: task_id,
		projectId: project_id,
		organizationId: org_id,
		actorId: actorId ?? null,
		eventType: type,
		fromValue,
		toValue,
		blockNote,
	});
}
