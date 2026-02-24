import { createTraceAsync } from "@repo/opentelemetry/trace";
import { and, eq, or } from "drizzle-orm";
import { db } from "@repo/database";
import { JobGroups } from "@repo/queue";

const API_URL =
    process.env.APP_ENV === "development"
        ? "http://localhost:5468/api/internal"
        : "http://backend:5468/api/internal";

export async function handleGithubCommitRef(
    job: JobGroups["github"] & { type: "github_commit_ref" }
) {
    const traceAsync = createTraceAsync();
    const {
        organizationId,
        repoOwner,
        repoName,
        repoPrivate,
        commitSha,
        commitUrl,
        commitMessage,
        authorLogin,
        matches,
    } = job.payload;

    for (const match of matches) {
        await traceAsync(
            "github.commit_ref.process",
            async () => {
                const task = await db.query.task.findFirst({
                    where: (t) =>
                        and(
                            eq(t.organizationId, organizationId),
                            or(
                                match.taskKey
                                    ? eq(t.shortId, match.taskKey)
                                    : undefined,
                                match.taskID
                                    ? eq(t.id, match.taskID)
                                    : undefined
                            )
                        ),
                });

                if (!task) return;

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
                            type: "github_commit_ref",
                            visibility: repoPrivate
                                ? "internal"
                                : "public",
                            data: {
                                repo: `${repoOwner}/${repoName}`,
                                commitSha,
                                commitUrl,
                                message: commitMessage,
                                author: authorLogin,
                            },
                        }),
                    }
                );

                if (!res.ok) {
                    console.error(
                        `❌ Failed to add commit ref timeline for task ${task.shortId}: ${res.statusText}`
                    );
                }
            },
            {
                description:
                    "Posting GitHub commit reference to task timeline",
                data: {
                    taskKey: match.taskKey,
                    commitSha,
                },
            }
        );
    }
}