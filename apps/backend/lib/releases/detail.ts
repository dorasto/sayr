import { db, getReleaseLabels, getUsersByIds, schema } from "@repo/database";
import { and, asc, eq } from "drizzle-orm";
import { type ReleaseDetail, toReleaseDetail } from "./serialize";

/** The release's labels, limited to labels of its own organization. */
export async function loadReleaseLabels(release: schema.releaseType): Promise<schema.labelType[]> {
	const labels = await getReleaseLabels(release.id);
	return labels.filter((label) => label.organizationId === release.organizationId);
}

/**
 * Loads everything `GET /v1/me/releases/:release` returns for an
 * already-resolved release row.
 *
 * Deliberately NOT `getReleaseWithTasks`: that helper loads every task with its
 * labels, assignees, creator, and full row — including the 1024-dim `embedding`
 * vector and the whole description — none of which a release view needs. Tasks
 * are selected as a slim projection instead, and every child query is scoped to
 * the release's own organization so a row from another org can never appear in
 * the response.
 */
export async function loadReleaseDetail(release: schema.releaseType): Promise<ReleaseDetail> {
	const orgId = release.organizationId;
	const userIds = [release.createdBy, release.leadId].filter((id): id is string => Boolean(id));

	const [users, labels, githubPullRequests, tasks] = await Promise.all([
		getUsersByIds(userIds),
		loadReleaseLabels(release),
		db.query.githubPullRequest.findMany({
			where: and(
				eq(schema.githubPullRequest.releaseId, release.id),
				eq(schema.githubPullRequest.organizationId, orgId)
			),
			columns: { body: false },
			orderBy: [asc(schema.githubPullRequest.prNumber)],
		}),
		db
			.select({
				id: schema.task.id,
				shortId: schema.task.shortId,
				title: schema.task.title,
				status: schema.task.status,
				priority: schema.task.priority,
				category: schema.task.category,
				visible: schema.task.visible,
				createdAt: schema.task.createdAt,
				updatedAt: schema.task.updatedAt,
			})
			.from(schema.task)
			.where(and(eq(schema.task.organizationId, orgId), eq(schema.task.releaseId, release.id)))
			.orderBy(asc(schema.task.shortId)),
	]);

	return toReleaseDetail({
		release,
		createdBy: users.find((user) => user.id === release.createdBy) ?? null,
		lead: users.find((user) => user.id === release.leadId) ?? null,
		labels,
		githubPullRequests,
		tasks,
	});
}
