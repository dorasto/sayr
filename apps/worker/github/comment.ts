import { createTraceAsync } from "@repo/opentelemetry/trace";
import { and, eq } from "drizzle-orm";
import { db } from "@repo/database";
import { markdownToProsekitJSON } from "./markdownToProsekit";

const API_URL =
    process.env.APP_ENV === "development"
        ? "http://localhost:5468/api/internal"
        : "http://backend:5468/api/internal";

export type PostSayrCommentContext = {
    // Sayr task
    taskKey: number;
    orgId: string;

    // GitHub source
    owner: string;
    repo: string;
    number: number;

    // Attribution
    authorLogin?: string;
};

export async function postSayrComment(
    ctx: PostSayrCommentContext,
    body: string
) {
    const traceAsync = createTraceAsync();

    return traceAsync(
        "sayr.comment.create",
        async () => {
            if (!body.trim()) {
                return;
            }

            const task = await db.query.task.findFirst({
                where: (t) =>
                    and(
                        eq(t.organizationId, ctx.orgId),
                        eq(t.shortId, ctx.taskKey)
                    ),
            });

            if (!task) {
                return;
            }

            const prosekitContent = markdownToProsekitJSON(body);

            const res = await fetch(
                `${API_URL}/v1/admin/organization/task/create-comment`,
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
                        org_id: ctx.orgId,
                        task_id: task.id,
                        content: prosekitContent,
                        source: "github",
                        externalAuthorLogin: ctx.authorLogin,
                        externalAuthorUrl: `https://github.com/${ctx.authorLogin}`,
                    }),
                }
            );

            if (!res.ok) {
                const msg = `❌ Failed to post comment to task ${ctx.taskKey}: ${res.statusText}`;
                console.error(msg);
                return msg;
            }

            console.log(`💬 Comment posted to task ${ctx.taskKey}.`);
            return `💬 Comment posted to task ${ctx.taskKey}.`;
        },
        {
            description: "Post Sayr comment from GitHub",
            data: {
                orgId: ctx.orgId,
                taskKey: ctx.taskKey,
                repo: ctx.repo,
                number: ctx.number,
                author: ctx.authorLogin,
            },
        }
    );
}