import { eq } from "drizzle-orm";
import { db } from "../database";
import * as schema from "../../schema";

/**
 * Fetches all issue templates for an organization with their labels and assignees.
 *
 * @param orgId - The unique identifier of the organization.
 * @returns A promise that resolves to an array of issue templates with their relations.
 *
 * @example
 * ```ts
 * const templates = await getIssueTemplates("org_123");
 * templates.forEach(template => {
 *   console.log(`${template.name} (${template.labels.length} labels)`);
 * });
 * ```
 */
export async function getIssueTemplates(orgId: string): Promise<schema.issueTemplateWithRelations[]> {
	const templates = await db.query.issueTemplate.findMany({
		where: (issueTemplate) => eq(issueTemplate.organizationId, orgId),
		with: {
			labels: {
				with: {
					label: true,
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
			category: true,
		},
	});

	return templates.map((template) => ({
		...template,
		labels: template.labels.map((tl) => tl.label),
		assignees: template.assignees.map((ta) => ({
			id: ta.user.id,
			name: ta.user.name,
			image: ta.user.image,
		})),
		category: template.category
			? {
					id: template.category.id,
					name: template.category.name,
					color: template.category.color,
					icon: template.category.icon,
				}
			: null,
	}));
}

/**
 * Fetches a single issue template by ID with its labels and assignees.
 *
 * @param templateId - The unique identifier of the template.
 * @returns A promise that resolves to the template with relations, or null if not found.
 */
export async function getIssueTemplateById(templateId: string): Promise<schema.issueTemplateWithRelations | null> {
	const template = await db.query.issueTemplate.findFirst({
		where: (issueTemplate) => eq(issueTemplate.id, templateId),
		with: {
			labels: {
				with: {
					label: true,
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
			category: true,
		},
	});

	if (!template) return null;

	return {
		...template,
		labels: template.labels.map((tl) => tl.label),
		assignees: template.assignees.map((ta) => ({
			id: ta.user.id,
			name: ta.user.name,
			image: ta.user.image,
		})),
		category: template.category
			? {
					id: template.category.id,
					name: template.category.name,
					color: template.category.color,
					icon: template.category.icon,
				}
			: null,
	};
}
