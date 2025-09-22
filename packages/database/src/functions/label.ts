import { and, eq } from "drizzle-orm";
import { label, projectLabelAssignment, taskLabelAssignment } from "../../schema/label.schema";
import { db } from "..";

/**
 * Retrieves a label by name within a given organization, or creates it
 * if it does not already exist.
 * Ensures labels are unique per organization by `(organizationId, name)`.
 *
 * @param orgId - The organization ID the label belongs to.
 * @param name - The label name (e.g. `"Urgent"`). Must be unique within the organization.
 * @param color - Optional hex color code for the label (defaults to `#cccccc`).
 * @returns The existing or newly created label row.
 *
 * @example
 * ```ts
 * // Reuse an existing label
 * const urgent1 = await getOrCreateLabel("org_1", "Urgent", "#ff0000");
 *
 * // Calling again with the same org + name returns the same label
 * const urgent2 = await getOrCreateLabel("org_1", "Urgent");
 *
 * console.log(urgent1.id === urgent2.id); // true
 * ```
 */
export async function getOrCreateLabel(orgId: string, name: string, color?: string) {
	const existing = await db.query.label.findFirst({
		where: (label) => and(eq(label.organizationId, orgId), eq(label.name, name)),
	});
	if (existing) {
		return existing;
	}

	const [created] = await db
		.insert(label)
		.values({
			organizationId: orgId,
			name,
			color: color ?? "#cccccc",
		})
		.returning();

	return created;
}

export async function getLabel(orgId: string, labelId: string) {
	const existing = await db.query.label.findFirst({
		where: (label) => and(eq(label.organizationId, orgId), eq(label.id, labelId)),
	});
	if (existing) {
		return existing;
	}
	return null;
}

/**
 * Assign a label to a task. If the label does not exist, it will be created.
 * This function is idempotent: if the task already has the label, no duplicate
 * assignment is created.
 *
 * @param orgId - The organization ID the label belongs to.
 * @param taskId - The ID of the task to assign the label to.
 * @param projectId - The project ID the task is part of (needed for join table).
 * @param labelId - The ID of the lable you want to add
 * @returns The label row that was assigned, or `null` if label creation failed.
 *
 * @example
 * ```ts
 * const label = await addLabelToTask("org_1", "task_42", "proj_1", "Urgent", "#ff0000");
 * if (label) {
 *   console.log(`Added label "${label.name}" to the task.`);
 * }
 * ```
 */
export async function addLabelToTask(orgId: string, taskId: string, projectId: string, labelId: string) {
	const tag = await getLabel(orgId, labelId);
	if (!tag) {
		return null;
	}
	// check if already assigned
	const [existingAssignment] = await db
		.select()
		.from(taskLabelAssignment)
		.where(and(eq(taskLabelAssignment.taskId, taskId), eq(taskLabelAssignment.labelId, tag.id)));

	if (existingAssignment) {
		return tag; // Already assigned
	}

	await db
		.insert(taskLabelAssignment)
		.values({
			taskId,
			projectId,
			labelId: tag.id,
		})
		.onConflictDoNothing();

	return tag;
}

export async function removeLabelFromTask(orgId: string, taskId: string, projectId: string, labelId: string) {
	const tag = await getLabel(orgId, labelId);
	if (!tag) {
		return null;
	}
	// check if already assigned
	const [existingAssignment] = await db
		.select()
		.from(taskLabelAssignment)
		.where(and(eq(taskLabelAssignment.taskId, taskId), eq(taskLabelAssignment.labelId, tag.id)));

	if (existingAssignment) {
		await db
			.delete(taskLabelAssignment)
			.where(
				and(
					eq(taskLabelAssignment.taskId, taskId),
					eq(taskLabelAssignment.projectId, projectId),
					eq(taskLabelAssignment.labelId, tag.id)
				)
			);
		return { success: true };
	} else {
		return { success: false, error: new Error("Label not assigned to task") };
	}
}

/**
 * Assign a label to a project. If the label does not exist, it will be created.
 * This function is idempotent: if the project already has the label, no duplicate
 * assignment is created.
 *
 * @param orgId - The organization ID the label belongs to.
 * @param projectId - The ID of the project to tag.
 * @param name - The label name (e.g. `"Urgent"`).
 * @param color - Optional hex color for the label (defaults to `#cccccc`).
 * @returns The label row that was assigned, or `null` if label creation failed.
 *
 * @example
 * ```ts
 * const label = await addLabelToProject("org_1", "proj_1", "Marketing", "#33c1ff");
 * if (label) {
 *   console.log(`Added label "${label.name}" to the project.`);
 * }
 * ```
 */
export async function addLabelToProject(orgId: string, projectId: string, name: string, color?: string) {
	const tag = await getOrCreateLabel(orgId, name, color);
	if (!tag) {
		return null;
	}
	// check if already assigned
	const [existingAssignment] = await db
		.select()
		.from(projectLabelAssignment)
		.where(and(eq(projectLabelAssignment.projectId, projectId), eq(projectLabelAssignment.labelId, tag.id)));

	if (existingAssignment) {
		return tag; // Already assigned
	}

	await db.insert(projectLabelAssignment).values({
		projectId,
		labelId: tag.id,
	});

	return tag;
}

/**
 * Safely remove a label only if it is not used in any project or task.
 *
 * If the label is still assigned to at least one project/task, deletion
 * is prevented and a descriptive error is returned.
 *
 * @param labelId - The ID of the label to delete.
 * @returns An object indicating the result:
 * - `{ success: true }` if the label was deleted successfully.
 * - `{ success: false, error: Error }` if deletion was blocked because
 *   the label is still in use.
 *
 * @example
 * ```ts
 * const res = await removeLabelSafely("lbl_urgent");
 * if (!res.success) {
 *   console.error(res.error.message);
 * } else {
 *   console.log("Label deleted");
 * }
 * ```
 */
export async function removeLabelSafely(labelId: string) {
	// check if label is assigned to *any* project
	const projectUse = await db.select().from(projectLabelAssignment).where(eq(projectLabelAssignment.labelId, labelId));

	// check if label is assigned to *any* task
	const taskUse = await db.select().from(taskLabelAssignment).where(eq(taskLabelAssignment.labelId, labelId));

	if (projectUse.length > 0 || taskUse.length > 0) {
		return {
			success: false,
			error: new Error("❌ Cannot delete label: still assigned to a project/task"),
		};
	}

	// safe to delete
	await db.delete(label).where(eq(label.id, labelId));
	return {
		success: true,
	};
}

/**
 * Get all usage of a label across related projects and tasks,
 * including counts.
 *
 * @param labelId - The ID of the label to inspect.
 * @returns An object describing the label and its usage:
 * - `{ success: false, error: Error }` if the label doesn't exist.
 * - `{ success: true, label, projects, tasks, counts }` if found.
 *
 * Where:
 * - `label`: Basic label info (`id`, `name`, `color`).
 * - `projects`: Array of { projectId, projectName }.
 * - `tasks`: Array of { taskId, taskTitle }.
 * - `counts`: { projects, tasks, total }.
 *
 * @example
 * ```ts
 * const usage = await getLabelUsage("lbl_urgent");
 * if (usage.success) {
 *   console.log(`${usage.label.name} is used in ${usage.counts.total} places.`);
 *   usage.projects.forEach(p => console.log(`Project: ${p.projectName}`));
 *   usage.tasks.forEach(t => console.log(`Task: ${t.taskTitle}`));
 * } else {
 *   console.log(usage.error.message);
 * }
 * ```
 */
export async function getLabelUsage(labelId: string) {
	const lbl = await db.query.label.findFirst({
		where: (labels) => eq(labels.id, labelId),
		with: {
			projectAssignments: {
				with: {
					project: true, // Pull project details
				},
			},
			taskAssignments: {
				with: {
					task: true, // Pull task details
				},
			},
		},
	});

	if (!lbl) {
		return {
			success: false,
			error: new Error("Label not found"),
		};
	}

	return {
		success: true,
		label: {
			id: lbl.id,
			name: lbl.name,
			color: lbl.color,
		},
		projects: lbl.projectAssignments.map((p) => ({
			projectId: p.projectId,
			projectName: p.project,
		})),
		tasks: lbl.taskAssignments.map((t) => ({
			taskId: t.taskId,
			taskTitle: t.task,
		})),
		counts: {
			projects: lbl.projectAssignments.length,
			tasks: lbl.taskAssignments.length,
			total: lbl.projectAssignments.length + lbl.taskAssignments.length,
		},
	};
}

/**
 * Fetches all labels belonging to a given organization.
 *
 * @param orgId - The ID of the organization whose labels should be retrieved.
 * @returns A promise that resolves to an array of label records from the database.
 *
 * @example
 * ```ts
 * const labels = await getLabels("org_123");
 * labels.forEach(label => {
 *   console.log(`${label.name} (${label.color})`);
 * });
 * ```
 */
export async function getLabels(orgId: string) {
	const lbl = await db.query.label.findMany({
		where: (label) => eq(label.organizationId, orgId),
	});
	return lbl;
}
