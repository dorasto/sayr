import { db, schema } from "@repo/database";
import { enqueue } from "@repo/queue";
import { verifySignature } from "@repo/util/github/verify";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

export const webhookRoute = new Hono();
webhookRoute.post("/github", async (c) => {
	const signature = c.req.header("x-hub-signature-256");
	const event = c.req.header("x-github-event");
	const rawBody = await c.req.text();

	if (!verifySignature(signature ?? null, rawBody)) {
		console.warn("❌ Invalid signature");
		return c.text("❌ invalid signature", 401);
	}

	const payload = JSON.parse(rawBody);

	switch (event) {
		case "installation":
			if (payload.action === "created") {
				const installation = payload.installation;
				const installationId = installation.id;

				// ✅ Create only the installation record
				await db.insert(schema.githubInstallation).values({
					id: crypto.randomUUID(),
					installationId,
				});

				console.log(`✅ Created installation record ${installationId}`);
				return c.text("Installation registered ✅");
			}

			if (payload.action === "deleted") {
				// Clean up if app is uninstalled
				const installationId = payload.installation.id;
				await db
					.delete(schema.githubInstallation)
					.where(eq(schema.githubInstallation.installationId, installationId));

				console.log(`❌ Deleted installation record ${installationId}`);
				return c.text("Installation deleted ✅");
			}

			break;
		// other cases (issues, PRs, comments) unchanged
		case "issues":
		case "issue_comment":
		case "pull_request":
			await handleContentEvents(event, payload);
			break;

		default:
			break;
	}

	return c.text("✅ Job(s) received");
});

// biome-ignore lint/suspicious/noExplicitAny: <fix later>
async function handleContentEvents(event: string, payload: any) {
	const { installation, repository } = payload;
	const installationId = installation.id;
	const repoId = repository.id;

	// Check if this repo has been activated in Sayr
	const linked = await db.query.githubRepository.findFirst({
		where: and(
			eq(schema.githubRepository.installationId, installationId),
			eq(schema.githubRepository.repoId, repoId)
		),
	});

	if (!linked) {
		console.log(`⚠️ Ignoring event for unlinked repo (${repoId})`);
		return;
	}
	switch (event) {
		case "issues":
			if (payload.action === "opened") {
				console.log(`🪶 Issue opened: #${payload.issue.number}`);
				enqueue("github", {
					type: "sayr_keyword_parse",
					payload: {
						text: payload.issue.body ?? "",
						title: payload.issue.title ?? "",
						owner: payload.repository.owner.login,
						repoId: payload.repository.id,
						repo: payload.repository.name,
						number: payload.issue.number,
						installationId: payload.installation.id,
						eventType: "issue",
						organizationId: linked.organizationId,
						categoryId: linked.categoryId,
					},
				});
			}
			break;

		case "issue_comment":
			if (payload.action === "created") {
				const issueNum = payload.issue.number;
				const commenter = payload.comment?.user?.login ?? "unknown";
				const body = payload.comment.body.trim();
				if (commenter.endsWith("[bot]")) return;
				console.log(`💬 Comment on #${issueNum} by ${commenter}`);
				enqueue("github", {
					type: "sayr_keyword_parse",
					payload: {
						text: body,
						title: "",
						owner: payload.repository.owner.login,
						repoId: payload.repository.id,
						repo: payload.repository.name,
						number: issueNum,
						installationId: payload.installation.id,
						eventType: "comment",
						merged: false,
						organizationId: linked.organizationId,
						categoryId: linked.categoryId,
					},
				});
			}
			break;

		// case "pull_request":
		// 	if (["opened", "synchronize", "closed"].includes(payload.action)) {
		// 		const prNum = payload.pull_request.number;
		// 		console.log(`🔀 PR #${prNum} (${payload.action})`);
		// 		enqueue({
		// 			type: "sayr_keyword_parse",
		// 			payload: {
		// 				text: payload.pull_request.body ?? "",
		// 				title: payload.pull_request.title ?? "",
		// 				owner: payload.repository.owner.login,
		// 				repoId: payload.repository.id,
		// 				repo: payload.repository.name,
		// 				number: prNum,
		// 				installationId: payload.installation.id,
		// 				eventType: "pr",
		// 				merged: payload.pull_request.merged ?? false,
		// 			},
		// 		});
		// 	}
		// 	break;
		default:
			break;
	}
}
