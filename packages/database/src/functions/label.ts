import { and, eq } from "drizzle-orm";
import { label, taskLabelAssignment } from "../../schema/label.schema";
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
export async function addLabelToTask(orgId: string, taskId: string, labelId: string) {
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
			organizationId: orgId,
			labelId: tag.id,
		})
		.onConflictDoNothing();

	return tag;
}

export async function removeLabelFromTask(orgId: string, taskId: string, labelId: string) {
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
					eq(taskLabelAssignment.organizationId, orgId),
					eq(taskLabelAssignment.labelId, tag.id)
				)
			);
		return { success: true };
	} else {
		return { success: false, error: new Error("Label not assigned to task") };
	}
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
		tasks: lbl.taskAssignments.map((t) => ({
			taskId: t.taskId,
			taskTitle: t.task,
		})),
		counts: {
			tasks: lbl.taskAssignments.length,
			total: lbl.taskAssignments.length,
		},
	};
}

/**
 * Fetches labels belonging to a given organization, optionally filtered by
 * visibility.
 *
 * @param orgId - The ID of the organization whose labels should be retrieved.
 * @param visible - Optional visibility filter. When provided, only labels with
 * the given visibility ("public" or "private") are returned.
 *
 * @returns A promise that resolves to an array of label records from the database.
 *
 * @example
 * ```ts
 * // Fetch all labels for an organization
 * const allLabels = await getLabels("org_123");
 *
 * // Fetch only public labels
 * const publicLabels = await getLabels("org_123", "public");
 *
 * publicLabels.forEach((label) => {
 *   console.log(`${label.name} (${label.color})`);
 * });
 * ```
 */
export async function getLabels(
	orgId: string,
	visible?: "public" | "private",
) {
	return await db.query.label.findMany({
		where: (label) =>
			and(
				eq(label.organizationId, orgId),
				visible ? eq(label.visible, visible) : undefined,
			),
	});
}