import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "..";

/**
 * Resolves the single GitHub repository link a task-sync path should use for
 * an organization, given an optional task category.
 *
 * Tries an exact category match first (a repo explicitly linked to that
 * category), then falls back to the catch-all repo link (`categoryId IS
 * NULL`). Only ever returns `enabled` links.
 *
 * This is the single source of truth for "which repo does this org's GitHub
 * sync use" — every sync path (task creation, status-close, description
 * sync, comment sync) should call this instead of hand-rolling the
 * exact-then-catchall lookup. Callers are still responsible for their own
 * `task.visible === "private"` skip — this helper only resolves the repo
 * link, it doesn't know about any particular task.
 *
 * @param orgId - The organization ID to look up a linked repo for.
 * @param categoryId - Optional task category ID to try an exact match against first.
 * @returns The matching `githubRepository` row, or `null` if none is linked/enabled.
 *
 * @example
 * ```ts
 * const repoLink = await findSyncEligibleGithubRepo(orgId, task.category);
 * if (!repoLink) return; // nothing to sync to
 * ```
 */
export async function findSyncEligibleGithubRepo(
	orgId: string,
	categoryId?: string | null
): Promise<schema.githubRepositoryType | null> {
	let foundLink: schema.githubRepositoryType | undefined;

	// 1. Try exact category match (if a category was provided)
	if (categoryId) {
		foundLink = await db.query.githubRepository.findFirst({
			where: and(
				eq(schema.githubRepository.organizationId, orgId),
				eq(schema.githubRepository.categoryId, categoryId),
				eq(schema.githubRepository.enabled, true)
			),
		});
	}

	// 2. Fallback to catch-all (categoryId IS NULL)
	if (!foundLink) {
		foundLink = await db.query.githubRepository.findFirst({
			where: and(
				eq(schema.githubRepository.organizationId, orgId),
				isNull(schema.githubRepository.categoryId),
				eq(schema.githubRepository.enabled, true)
			),
		});
	}

	return foundLink ?? null;
}
