import { and, eq } from "drizzle-orm";
import { db, schema } from "..";

/**
 * Creates a new project within an organization, ensuring uniqueness
 * of the project name inside that organization.
 *
 * If a project with the same name already exists under the given
 * organization, the creation will fail and return an error object.
 *
 * @param orgId - The ID of the organization where the project
 * should be created.
 * @param name - The name of the project to create. Must be unique
 * within the organization.
 * @param description - The description of the project to create
 * @returns A promise resolving to an object indicating success or failure.
 *
 * - On success:
 *   `{ success: true, data: Project }`
 *
 * - On failure (duplicate name):
 *   `{ success: false, error: Error }`
 *
 * @example
 * ```ts
 * const result = await createProject("org_123", "Website Redesign");
 *
 * if (result.success) {
 *   console.log("Project created:", result.data.name);
 * } else {
 *   console.error("Failed:", result.error.message);
 * }
 * ```
 */
export async function createProject(orgId: string, name: string, description: string) {
	// Step 1: Check if project already exists in this org
	const foundProject = await db.query.project.findFirst({
		where: (project) => and(eq(project.organizationId, orgId), eq(project.name, name)),
	});

	if (foundProject) {
		return {
			success: false,
			error: new Error("❌ Already have a project named that"),
		};
	}

	// Step 2: Insert new project
	const [project] = await db
		.insert(schema.project)
		.values({
			organizationId: orgId,
			name: name,
			description: description,
		})
		.returning();

	return {
		success: true,
		data: project,
	};
}

/**
 * Retrieves a single project by ID.
 *
 * @param orgId - The ID of the organization where the project is to fetch.
 * @param projectId - The project ID to fetch.
 * @returns The project with related tasks and labels, or null if not found.
 */
export async function getProjectById(orgId: string, projectId: string) {
	return db.query.project.findFirst({
		where: (p) => and(eq(p.organizationId, orgId), eq(p.id, projectId)),
		with: {
			tasks: true,
			projectLabels: {
				with: { label: true },
			},
		},
	});
}
