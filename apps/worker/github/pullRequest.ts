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
export async function handleGithubBranchLink(
    job: JobGroups["github"] & { type: "branch_create" }
) {
    const traceAsync = createTraceAsync();

    const {
        organizationId,
        owner,
        repo,
        repoId,
        repo_private,
        branch,
        author,
        userId,
        taskKey,
    } = job.payload;

    if (!organizationId) return;

    await traceAsync(
        "github.branch_create.link.process",
        async () => {
            // 1️⃣ Find repository
            const repository = await db.query.githubRepository.findFirst({
                where: eq(schema.githubRepository.repoId, repoId),
            });

            if (!repository) return;

            // 2️⃣ Find matching task (from taskKey)
            let task: typeof schema.task.$inferSelect | null = null;

            if (taskKey) {
                const found = await db.query.task.findFirst({
                    where: (t) =>
                        and(
                            eq(t.organizationId, organizationId),
                            eq(t.shortId, taskKey)
                        ),
                });

                if (found) {
                    task = found;
                }
            }

            // 3️⃣ Upsert branch link (one per repo + branch)
            await db
                .insert(schema.githubBranchLink)
                .values({
                    repositoryId: repository.id,
                    organizationId,
                    taskId: task?.id ?? null,
                    branchName: branch,
                })
                .onConflictDoUpdate({
                    target: [
                        schema.githubBranchLink.repositoryId,
                        schema.githubBranchLink.branchName,
                    ],
                    set: {
                        taskId: task?.id ?? null,
                        updatedAt: new Date(),
                    },
                });

            // 4️⃣ If no task, we’re done (branch tracked but not linked to a task)
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
                        "x-internal-secret": process.env.INTERNAL_SECRET!,
                        "x-internal-service": "sayr-worker",
                        "x-internal-timestamp": new Date().toISOString(),
                    },
                    body: JSON.stringify({
                        org_id: organizationId,
                        task_id: task.id,
                        type: "github_branch_linked",
                        visibility: repo_private ? "internal" : "public",
                        ...(linkedUserId && { createdBy: linkedUserId }),
                        data: {
                            provider: "github",
                            repository: {
                                name: repo,
                                owner,
                            },
                            branch: {
                                name: branch,
                                url: `https://github.com/${owner}/${repo}/tree/${branch}`,
                                deleted: false,
                            },
                            author,
                        },
                    }),
                }
            );

            if (!res.ok) {
                console.error(
                    `❌ Failed to add branch timeline for task ${task.shortId}: ${res.statusText}`
                );
            }
        },
        {
            description:
                "Persisting GitHub branch link and posting timeline activity",
            data: {
                branchName: branch,
                repoId,
            },
        }
    );
}

export async function handleGithubBranchDelete(
    job: JobGroups["github"] & { type: "branch_delete" }
) {
    const traceAsync = createTraceAsync();

    const {
        organizationId,
        owner,
        repo,
        repoId,
        repo_private,
        branch,
        author,
        userId,
    } = job.payload;

    if (!organizationId) return;

    await traceAsync(
        "github.branch_delete.link.process",
        async () => {
            // 1️⃣ Find repository
            const repository = await db.query.githubRepository.findFirst({
                where: eq(schema.githubRepository.repoId, repoId),
            });
            if (!repository) return;

            // 2️⃣ Find existing branch link
            const branchLink = await db.query.githubBranchLink.findFirst({
                where: (b) =>
                    and(
                        eq(b.repositoryId, repository.id),
                        eq(b.organizationId, organizationId),
                        eq(b.branchName, branch)
                    ),
            });

            if (!branchLink) return; // nothing to delete / log

            // 3️⃣ Resolve task from branchLink (if any)
            let task: any;

            if (branchLink.taskId) {
                task = await db.query.task.findFirst({
                    where: (t) =>
                        and(
                            eq(t.id, branchLink.taskId || ""),
                            eq(t.organizationId, organizationId)
                        ),
                });
            }

            // 4️⃣ Delete branch link
            await db
                .delete(schema.githubBranchLink)
                .where(eq(schema.githubBranchLink.id, branchLink.id));

            // 5️⃣ If no task, we’re done
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
                        "x-internal-secret": process.env.INTERNAL_SECRET!,
                        "x-internal-service": "sayr-worker",
                        "x-internal-timestamp": new Date().toISOString(),
                    },
                    body: JSON.stringify({
                        org_id: organizationId,
                        task_id: task.id,
                        // if you have a dedicated type, e.g. "github_branch_unlinked", use that
                        type: "github_branch_linked",
                        visibility: repo_private ? "internal" : "public",
                        ...(linkedUserId && { createdBy: linkedUserId }),
                        data: {
                            provider: "github",
                            repository: {
                                name: repo,
                                owner,
                            },
                            branch: {
                                name: branch,
                                url: `https://github.com/${owner}/${repo}/tree/${branch}`,
                                deleted: true,
                            },
                            author,
                        },
                    }),
                }
            );

            if (!res.ok) {
                console.error(
                    `❌ Failed to add branch delete timeline for task ${task.shortId}: ${res.statusText}`
                );
            }
        },
        {
            description:
                "Deleting GitHub branch link and posting timeline activity",
            data: {
                branchName: branch,
                repoId,
            },
        }
    );
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
        draft,
        state
    } = job.payload;

    if (!organizationId) return;

    await traceAsync(
        "github.pull_request.link.process",
        async () => {
            // 1️⃣ Find repository
            const repository = await db.query.githubRepository.findFirst({
                where: and(eq(schema.githubRepository.repoId, repoId), eq(schema.githubRepository.organizationId, organizationId)),
            });

            if (!repository) return;

            const foundBranch = await db.query.githubBranchLink.findFirst({
                where: and(eq(schema.githubBranchLink.organizationId, organizationId), eq(schema.githubBranchLink.repositoryId, repository.id), eq(schema.githubBranchLink.branchName, headBranch))
            })

            // 2️⃣ Find matching task
            let task = null;
            if (foundBranch) {
                const foundTaskViaBranch = await db.query.task.findFirst({
                    where: (t) =>
                        and(
                            eq(t.organizationId, organizationId),
                            eq(t.id, foundBranch.taskId || "")
                        ),
                });

                if (foundTaskViaBranch) {
                    task = foundTaskViaBranch;
                }
            }
            if (task === null) {
                for (const match of matches) {
                    const found = await db.query.task.findFirst({
                        where: (t) =>
                            and(
                                eq(t.organizationId, organizationId),
                                eq(t.shortId, match.taskKey)
                            ),
                    });
                    console.log("🚀 ~ handleGithubPullRequestLink ~ found:", found)

                    if (found) {
                        task = found;
                        break;
                    }
                }
            }

            // 2.5️⃣ Check if PR already exists
            const existingPr = await db.query.githubPullRequest.findFirst({
                where: (t) =>
                    and(
                        eq(t.repositoryId, repository.id),
                        eq(t.prNumber, number)
                    ),
            });

            // we'll only process commits when PR is first created
            const shouldProcessCommits = !existingPr;

            // 3️⃣ Upsert PR
            const [newPr] = await db
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
                    state: draft ? "draft" : state,
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
                        state: draft ? "draft" : state,
                        updatedAt: new Date(),
                    },
                })
                .returning();

            // 4️⃣ If linked to task → send timeline activity
            if (!task) return;
            if (!shouldProcessCommits) return;
            if (!newPr || !newPr.taskId) return;
            const linkedUserId = await findLinkedSayrUser(userId || 0);

            const res = await fetch(
                `${API_URL}/v1/admin/organization/task/activity`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        cookie: `sayr_internal=${process.env.INTERNAL_SECRET};`,
                        "user-agent": "Sayr-Worker/1.0",
                        "x-internal-secret": process.env.INTERNAL_SECRET!,
                        "x-internal-service": "sayr-worker",
                        "x-internal-timestamp": new Date().toISOString(),
                    },
                    body: JSON.stringify({
                        org_id: organizationId,
                        task_id: task.id,
                        type: "github_pr_linked",
                        visibility: repo_private ? "internal" : "public",
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
            if (foundBranch) return;
            const token = await getInstallationToken(repository.installationId);
            const compareRes = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/compare/${baseBranch}...${headSha}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/vnd.github+json",
                    },
                }
            );

            if (!compareRes.ok) return;

            try {
                const compareData = await compareRes.json();
                const commits = compareData.commits ?? [];

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
                            userId: commit.author?.id || userId,
                            authorLogin: commit.author?.login ?? null,
                            authorEmail: commit.commit?.author?.email ?? null,

                            // if this should refer to the task, use task.shortId instead
                            matches: [
                                {
                                    keyword: "pr_commit",
                                    taskKey: newPr.prNumber,
                                    taskID: newPr.taskId,
                                },
                            ],
                        },
                    });
                }
            } catch (_err) {
                // swallow or log as needed
            }
        },
        {
            description: "Persisting GitHub PR and posting timeline activity",
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
                        userId: commit.author.id || userId,
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