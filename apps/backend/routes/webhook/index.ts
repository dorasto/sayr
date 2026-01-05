import type { AppEnv } from "@/index";
import { createTraceAsync, getTraceContext } from "@/tracing/wideEvent";
import { db, schema } from "@repo/database";
import { enqueue } from "@repo/queue";
import { verifySignature } from "@repo/util/github/verify";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

export const webhookRoute = new Hono<AppEnv>();
webhookRoute.post("/github", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const signature = c.req.header("x-hub-signature-256");
	const event = c.req.header("x-github-event");
	const rawBody = await c.req.text();

	if (!verifySignature(signature ?? null, rawBody)) {
		await recordWideError({
			name: "webhook.github.signature",
			error: new Error("Invalid signature"),
			code: "INVALID_SIGNATURE",
			message: "GitHub webhook signature verification failed",
			contextData: { event },
		});
		return c.text("❌ invalid signature", 401);
	}

	const payload = JSON.parse(rawBody);

	switch (event) {
		case "installation":
			return handleInstallationEvent(payload, traceAsync);

		case "issues":
		case "issue_comment":
		case "pull_request":
			await handleContentEvents(event, payload, traceAsync);
			break;

		default:
			break;
	}

	return c.text("✅ Job(s) received");
});

async function handleInstallationEvent(
	payload: { action: string; installation: { id: number } },
	traceAsync: ReturnType<typeof createTraceAsync>,
) {
	const installationId = payload.installation.id;

	if (payload.action === "created") {
		await traceAsync(
			"webhook.github.installation.create",
			() =>
				db.insert(schema.githubInstallation).values({
					id: crypto.randomUUID(),
					installationId,
				}),
			{
				description: "Creating GitHub installation record",
				data: { installationId },
				onSuccess: () => ({
					outcome: "Installation record created",
					data: { installationId },
				}),
			},
		);

		return new Response("Installation registered ✅");
	}

	if (payload.action === "deleted") {
		await traceAsync(
			"webhook.github.installation.delete",
			() =>
				db
					.delete(schema.githubInstallation)
					.where(eq(schema.githubInstallation.installationId, installationId)),
			{
				description: "Deleting GitHub installation record",
				data: { installationId },
				onSuccess: () => ({
					outcome: "Installation record deleted",
					data: { installationId },
				}),
			},
		);

		return new Response("Installation deleted ✅");
	}

	return new Response("✅ Job(s) received");
}

async function handleContentEvents(
	event: string,
	// biome-ignore lint/suspicious/noExplicitAny: <fix later>
	payload: any,
	traceAsync: ReturnType<typeof createTraceAsync>,
) {
	const { installation, repository } = payload;
	const installationId = installation.id;
	const repoId = repository.id;

	const linked = await traceAsync(
		"webhook.github.repo_lookup",
		() =>
			db.query.githubRepository.findFirst({
				where: and(
					eq(schema.githubRepository.installationId, installationId),
					eq(schema.githubRepository.repoId, repoId),
				),
			}),
		{
			description: "Checking if repository is linked",
			data: { installationId, repoId },
		},
	);

	if (!linked) return;

	const traceContext = getTraceContext();

	switch (event) {
		case "issues":
			if (payload.action === "opened") {
				await traceAsync(
					"webhook.github.issue.enqueue",
					() =>
						enqueue("github", {
							type: "sayr_keyword_parse",
							traceContext,
							payload: {
								text: payload.issue.body ?? "",
								title: payload.issue.title ?? "",
								owner: repository.owner.login,
								repoId: repository.id,
								repo: repository.name,
								number: payload.issue.number,
								installationId,
								eventType: "issue",
								organizationId: linked.organizationId,
								categoryId: linked.categoryId,
							},
						}),
					{
						description: "Enqueueing issue for processing",
						data: {
							issueNumber: payload.issue.number,
							repoId,
							organizationId: linked.organizationId,
							traceId: traceContext?.traceId,
						},
						onSuccess: () => ({
							outcome: "Issue enqueued successfully",
							data: { issueNumber: payload.issue.number },
						}),
					},
				);
			}
			break;

		case "issue_comment":
			if (payload.action === "created") {
				const issueNum = payload.issue.number;
				const commenter = payload.comment?.user?.login ?? "unknown";
				const body = payload.comment.body.trim();

				if (commenter.endsWith("[bot]")) return;

				await traceAsync(
					"webhook.github.comment.enqueue",
					() =>
						enqueue("github", {
							type: "sayr_keyword_parse",
							traceContext,
							payload: {
								text: body,
								title: "",
								owner: repository.owner.login,
								repoId: repository.id,
								repo: repository.name,
								number: issueNum,
								installationId,
								eventType: "comment",
								merged: false,
								organizationId: linked.organizationId,
								categoryId: linked.categoryId,
							},
						}),
					{
						description: "Enqueueing comment for processing",
						data: {
							issueNum,
							commenter,
							repoId,
							organizationId: linked.organizationId,
							traceId: traceContext?.traceId,
						},
						onSuccess: () => ({
							outcome: "Comment enqueued successfully",
							data: { issueNum, commenter },
						}),
					},
				);
			}
			break;

		default:
			break;
	}
}
