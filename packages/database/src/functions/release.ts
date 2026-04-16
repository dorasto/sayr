import { and, asc, desc, eq, inArray, isNull, not, or } from "drizzle-orm";
import { db, schema } from "..";
import { getUsersByIds, userSummaryColumns } from "./index";

/**
 * Fetches a single release by its ID.
 *
 * @param releaseId - The unique ID of the release
 * @returns Promise resolving to release data or null if not found
 */
export async function getRelease(releaseId: string): Promise<schema.releaseType | null> {
	const release = await db.query.release.findFirst({
		where: eq(schema.release.id, releaseId),
	});

	return release || null;
}

/**
 * Fetches a release by its slug within an organization.
 *
 * @param orgId - The organization ID
 * @param slug - The release slug
 * @returns Promise resolving to release data or null if not found
 */
export async function getReleaseBySlug(orgId: string, slug: string): Promise<schema.releaseType | null> {
	const release = await db.query.release.findFirst({
		where: and(eq(schema.release.organizationId, orgId), eq(schema.release.slug, slug)),
	});

	return release || null;
}

/**
 * Fetches all releases for an organization, ordered by slug/targetDate.
 *
 * @param orgId - The organization ID
 * @returns Promise resolving to array of releases
 */
export async function getReleases(orgId: string): Promise<schema.releaseType[]> {
	const releases = await db.query.release.findMany({
		where: eq(schema.release.organizationId, orgId),
		orderBy: [
			// Order by targetDate descending (nulls last), then by slug
			desc(schema.release.targetDate),
			asc(schema.release.slug),
		],
	});

	return releases;
}

/**
 * Fetches a release with all its associated tasks.
 *
 * @param releaseId - The unique ID of the release
 * @returns Promise resolving to release with tasks or null if not found
 */
export async function getReleaseWithTasks(releaseId: string): Promise<schema.ReleaseWithTasks | null> {
	const release = await db.query.release.findFirst({
		where: eq(schema.release.id, releaseId),
	});

	if (!release) {
		return null;
	}

	// Fetch tasks for this release
	const tasks = await db.query.task.findMany({
		where: eq(schema.task.releaseId, releaseId),
		with: {
			labels: {
				with: {
					label: true,
				},
			},
			assignees: {
				with: {
					user: {
						columns: userSummaryColumns,
					},
				},
			},
			createdBy: {
				columns: userSummaryColumns,
			},
		},
	});

	// Transform tasks to TaskWithLabels format
	const tasksWithLabels: schema.TaskWithLabels[] = tasks.map((task) => ({
		...task,
		labels: task.labels.map((l) => l.label),
		assignees: task.assignees.map((a) => a.user),
		description: task.description as schema.NodeJSON,
	}));

	// Get creator info if available
	let createdBy: schema.UserSummary | null = null;
	if (release.createdBy) {
		const creators = await getUsersByIds([release.createdBy]);
		if (creators[0]) {
			createdBy = creators[0];
		}
	}

	const result: schema.ReleaseWithTasks = {
		...release,
		tasks: tasksWithLabels,
		createdBy,
	};

	return result;
}

/**
 * Creates a new release.
 *
 * @param data - Release creation data
 * @returns Promise resolving to created release
 */
export async function createRelease(data: {
	id: string;
	organizationId: string;
	name: string;
	slug: string;
	description?: schema.NodeJSON;
	status?: "planned" | "in-progress" | "released" | "archived";
	targetDate?: Date;
	color?: string;
	icon?: string;
	createdBy?: string;
}): Promise<schema.releaseType> {
	const [release] = await db
		.insert(schema.release)
		.values({
			id: data.id,
			organizationId: data.organizationId,
			name: data.name,
			slug: data.slug,
			description: data.description,
			status: data.status || "planned",
			targetDate: data.targetDate,
			color: data.color || "hsla(0, 0%, 0%, 1)",
			icon: data.icon,
			createdBy: data.createdBy,
		})
		.returning();

	if (!release) {
		throw new Error("Failed to create release");
	}

	return release;
}

/**
 * Updates an existing release.
 *
 * @param releaseId - The unique ID of the release to update
 * @param data - Partial release data to update
 * @returns Promise resolving to updated release
 */
export async function updateRelease(
	releaseId: string,
	data: Partial<{
		name: string;
		slug: string;
		description: schema.NodeJSON;
		status: "planned" | "in-progress" | "released" | "archived";
		targetDate: Date | null;
		releasedAt: Date | null;
		color: string;
		icon: string;
	}>
): Promise<schema.releaseType> {
	const [release] = await db
		.update(schema.release)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(eq(schema.release.id, releaseId))
		.returning();

	if (!release) {
		throw new Error("Failed to update release");
	}

	return release;
}

/**
 * Deletes a release and sets all associated tasks' releaseId to null.
 *
 * @param releaseId - The unique ID of the release to delete
 * @returns Promise resolving when deletion is complete
 */
export async function deleteRelease(releaseId: string): Promise<void> {
	// First, set all tasks' releaseId to null
	await db.update(schema.task).set({ releaseId: null }).where(eq(schema.task.releaseId, releaseId));

	// Then delete the release
	await db.delete(schema.release).where(eq(schema.release.id, releaseId));
}

/**
 * Marks a release as released and updates all incomplete tasks to "done".
 * Tasks with status "canceled" are not updated.
 *
 * @param releaseId - The unique ID of the release to mark as released
 * @param actorId - The user ID of the person marking the release
 * @returns Promise resolving to updated release and array of updated task IDs
 */
export async function markReleaseAsReleased(
	releaseId: string,
	actorId: string
): Promise<{ release: schema.releaseType; updatedTaskIds: string[] }> {
	// Update the release status
	const [release] = await db
		.update(schema.release)
		.set({
			status: "released",
			releasedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(schema.release.id, releaseId))
		.returning();

	if (!release) {
		throw new Error("Failed to update release status");
	}

	// Find all tasks in this release that are NOT done and NOT canceled
	const tasksToUpdate = await db.query.task.findMany({
		where: and(
			eq(schema.task.releaseId, releaseId),
			not(eq(schema.task.status, "done")),
			not(eq(schema.task.status, "canceled"))
		),
		columns: {
			id: true,
		},
	});

	const taskIds = tasksToUpdate.map((t) => t.id);

	// Update tasks to "done" if there are any
	if (taskIds.length > 0) {
		await db
			.update(schema.task)
			.set({
				status: "done",
				updatedAt: new Date(),
			})
			.where(inArray(schema.task.id, taskIds));
	}

	return {
		release,
		updatedTaskIds: taskIds,
	};
}
