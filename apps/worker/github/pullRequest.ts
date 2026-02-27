import { createTraceAsync } from "@repo/opentelemetry/trace";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@repo/database";
import { enqueue, JobGroups } from "@repo/queue";
import { getInstallationToken } from "@repo/util/github/auth";

const API_URL =
    process.env.APP_ENV === "development"
        ? "http://localhost:5468/api/internal"
        : "http://backend:5468/api/internal";
/**
 * Attempts to find a Sayr user linked to the given GitHub numeric ID.
 * Returns the Sayr user ID if found, otherwise undefined.
 */
async function findLinkedSayrUser(githubId?: number): Promise<string | undefined> {
    if (!githubId) return undefined;

    const linked = await db.query.account.findFirst({
        where: (a) =>
            and(
                eq(a.providerId, "github"),
                eq(a.accountId, String(githubId))
            ),
        columns: { userId: true },
    });

    return linked?.userId;
}
export async function handleGithubPullRequestLink(
    job: JobGroups["github"] & { type: "pull_request_link" }
) {
    const traceAsync = createTraceAsync();

    const {
        organizationId,
        owner,
        repo,
        repoId,
        repo_private,
        number,
        title,
        body,
        headSha,
        headBranch,
        baseBranch,
        author,
        userId,
        matches,
    } = job.payload;

    if (!organizationId) return;

    await traceAsync(
        "github.pull_request.link.process",
        async () => {
            // 1️⃣ Find repository
            const repository =
                await db.query.githubRepository.findFirst({
                    where: eq(
                        schema.githubRepository.repoId,
                        repoId
                    ),
                });

            if (!repository) return;

            // 2️⃣ Find matching task
            let task = null;

            for (const match of matches) {
                const found = await db.query.task.findFirst({
                    where: (t) =>
                        and(
                            eq(t.organizationId, organizationId),
                            eq(t.shortId, match.taskKey)
                        ),
                });

                if (found) {
                    task = found;
                    break;
                }
            }

            // 3️⃣ Upsert PR
            await db
                .insert(schema.githubPullRequest)
                .values({
                    repositoryId: repository.id,
                    organizationId,
                    taskId: task?.id ?? null,
                    prNumber: number,
                    prUrl: `https://github.com/${owner}/${repo}/pull/${number}`,
                    title,
                    body,
                    headSha,
                    headBranch,
                    baseBranch,
                    state: "open",
                    merged: false,
                })
                .onConflictDoUpdate({
                    target: [
                        schema.githubPullRequest.repositoryId,
                        schema.githubPullRequest.prNumber,
                    ],
                    set: {
                        title,
                        body,
                        headSha,
                        headBranch,
                        baseBranch,
                        updatedAt: new Date(),
                    },
                });

            // 4️⃣ If linked to task → send timeline activity
            if (!task) return;
            const linkedUserId = await findLinkedSayrUser(userId || 0);

            const res = await fetch(
                `${API_URL}/v1/admin/organization/task/activity`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        cookie: `sayr_internal=${process.env.INTERNAL_SECRET};`,
                        "user-agent": "Sayr-Worker/1.0",
                        "x-internal-secret":
                            process.env.INTERNAL_SECRET!,
                        "x-internal-service":
                            "sayr-worker",
                        "x-internal-timestamp":
                            new Date().toISOString(),
                    },
                    body: JSON.stringify({
                        org_id: organizationId,
                        task_id: task.id,
                        type: "github_pr_linked",
                        visibility: repo_private
                            ? "internal"
                            : "public",
                        ...(linkedUserId && { createdBy: linkedUserId }),
                        data: {
                            provider: "github",
                            repository: {
                                name: repo,
                                owner,
                            },
                            pullRequest: {
                                number,
                                title,
                                url: `https://github.com/${owner}/${repo}/pull/${number}`,
                                headBranch,
                                baseBranch,
                                headSha,
                            },
                            author,
                        },
                    }),
                }
            );

            if (!res.ok) {
                console.error(
                    `❌ Failed to add PR timeline for task ${task.shortId}: ${res.statusText}`
                );
            }
        },
        {
            description:
                "Persisting GitHub PR and posting timeline activity",
            data: {
                prNumber: number,
                repoId,
            },
        }
    );
}

export async function handleGithubPullRequestSync(
    job: JobGroups["github"] & { type: "pull_request_sync" }
) {
    const traceAsync = createTraceAsync();

    const {
        organizationId,
        repoId,
        repo_private,
        owner,
        repo,
        number,
        headSha,
        headBranch,
        before,
        after,
        userId
    } = job.payload;

    if (!organizationId) return;
    if (!before || !after) return;

    await traceAsync(
        "github.pull_request.sync.process",
        async () => {
            // 1️⃣ Find repository
            const repository =
                await db.query.githubRepository.findFirst({
                    where: eq(
                        schema.githubRepository.repoId,
                        repoId
                    ),
                });

            if (!repository) return;

            // 2️⃣ Find PR
            const existingPr =
                await db.query.githubPullRequest.findFirst({
                    where: (t) =>
                        and(
                            eq(t.repositoryId, repository.id),
                            eq(t.prNumber, number)
                        ),
                });

            if (!existingPr) return;

            // 3️⃣ Update PR head
            await db
                .update(schema.githubPullRequest)
                .set({
                    headSha,
                    headBranch,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(
                            schema.githubPullRequest.repositoryId,
                            repository.id
                        ),
                        eq(
                            schema.githubPullRequest.prNumber,
                            number
                        )
                    )
                );

            // 4️⃣ If no task linked → stop
            if (!existingPr.taskId) return;

            // 5️⃣ Get installation token
            const token = await getInstallationToken(
                repository.installationId
            );

            // 6️⃣ Fetch commits via Compare API
            const compareRes = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/compare/${before}...${after}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/vnd.github+json",
                    },
                }
            );

            if (!compareRes.ok) {
                console.error("❌ Failed to fetch PR commits");
                return;
            }

            const compareData = await compareRes.json();
            const commits = compareData.commits ?? [];

            // 7️⃣ Process commits like normal push
            for (const commit of commits) {
                const message = commit.commit?.message?.trim();
                if (!message) continue;
                await enqueue("github", {
                    type: "github_commit_ref",
                    traceContext: job.traceContext,
                    payload: {
                        organizationId,
                        repoOwner: owner,
                        repoName: repo,
                        repoPrivate: repo_private,

                        commitSha: commit.sha,
                        commitUrl: commit.html_url,
                        commitMessage: message,
                        userId: userId,
                        authorLogin:
                            commit.author?.login ?? null,
                        authorEmail:
                            commit.commit?.author?.email ??
                            null,

                        matches: [{
                            keyword: "pr_commit",
                            taskKey: existingPr.prNumber,
                            taskID: existingPr.taskId,
                        }],
                    },
                });
            }
        },
        {
            description:
                "Syncing PR commits and processing like push events",
            data: {
                prNumber: number,
                headSha,
            },
        }
    );
}

export async function handleGithubPullRequestClosed(
    job: JobGroups["github"] & { type: "pull_request_closed" }
) {
    const traceAsync = createTraceAsync();

    const {
        organizationId,
        repoId,
        repo_private,
        owner,
        repo,
        number,
        merged,
        mergedAt,
        mergeCommitSha, userId
    } = job.payload;

    if (!organizationId) return;

    await traceAsync(
        "github.pull_request.closed.process",
        async () => {
            // 1️⃣ Find repository
            const repository =
                await db.query.githubRepository.findFirst({
                    where: eq(
                        schema.githubRepository.repoId,
                        repoId
                    ),
                });

            if (!repository) return;

            // 2️⃣ Find PR via (repositoryId, prNumber)
            const existingPr =
                await db.query.githubPullRequest.findFirst({
                    where: (t) =>
                        and(
                            eq(t.repositoryId, repository.id),
                            eq(t.prNumber, number)
                        ),
                });

            if (!existingPr) return;

            // 3️⃣ Update PR state
            await db
                .update(schema.githubPullRequest)
                .set({
                    state: "closed",
                    merged,
                    mergeCommitSha: mergeCommitSha ?? null,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(
                            schema.githubPullRequest.repositoryId,
                            repository.id
                        ),
                        eq(
                            schema.githubPullRequest.prNumber,
                            number
                        ),
                        eq(
                            schema.githubPullRequest.id,
                            existingPr.id,
                        )
                    )
                );

            // 4️⃣ If no linked task → stop
            if (!existingPr.taskId) return;

            // 5️⃣ Post timeline event
            const eventType = merged
                ? "github_pr_merged"
                : "github_pr_closed";
            const linkedUserId = await findLinkedSayrUser(userId || 0);

            const activityRes = await fetch(
                `${API_URL}/v1/admin/organization/task/activity`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        cookie: `sayr_internal=${process.env.INTERNAL_SECRET};`,
                        "user-agent": "Sayr-Worker/1.0",
                        "x-internal-secret":
                            process.env.INTERNAL_SECRET!,
                        "x-internal-service":
                            "sayr-worker",
                        "x-internal-timestamp":
                            new Date().toISOString(),
                    },
                    body: JSON.stringify({
                        org_id: organizationId,
                        task_id: existingPr.taskId,
                        type: eventType,
                        visibility: repo_private
                            ? "internal"
                            : "public",
                        ...(linkedUserId && { createdBy: linkedUserId }),
                        data: {
                            provider: "github",
                            repository: {
                                name: repo,
                                owner,
                            },
                            pullRequest: {
                                number,
                                url: `https://github.com/${owner}/${repo}/pull/${number}`,
                                merged,
                                mergedAt,
                                mergeCommitSha,
                            },
                        },
                    }),
                }
            );

            if (!activityRes.ok) {
                console.error(
                    `❌ Failed to add PR closed timeline for PR #${number}: ${activityRes.statusText}`
                );
            }

            // 6️⃣ Auto-complete task if merged
            if (merged) {
                const updateRes = await fetch(
                    `${API_URL}/v1/admin/organization/task/update`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            cookie: `sayr_internal=${process.env.INTERNAL_SECRET};`,
                            "user-agent": "Sayr-Worker/1.0",
                            "x-internal-secret":
                                process.env.INTERNAL_SECRET!,
                            "x-internal-service":
                                "sayr-worker",
                            "x-internal-timestamp":
                                new Date().toISOString(),
                        },
                        body: JSON.stringify({
                            org_id: organizationId,
                            task_id: existingPr.taskId,
                            status: "done",
                            ...(linkedUserId && { createdBy: linkedUserId }),
                        }),
                    }
                );

                if (!updateRes.ok) {
                    console.error(
                        `❌ Failed to auto-complete task for merged PR #${number}: ${updateRes.statusText}`
                    );
                }
            }
        },
        {
            description:
                "Closing GitHub PR, posting timeline, and auto-completing task if merged",
            data: {
                prNumber: number,
                merged,
            },
        }
    );
}