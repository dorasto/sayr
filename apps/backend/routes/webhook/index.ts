import { db, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { enqueue } from "../../github/queue";
import { verifySignature } from "../../github/verify";

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
				const owner = installation.account?.login ?? "unknown";

				for (const repo of payload.repositories ?? []) {
					await db.insert(schema.githubIntegration).values({
						id: crypto.randomUUID(),
						installationId: installation.id,
						repoId: repo.id,
						repoName: repo.name,
						owner,
					});
					console.log(`✅ Linked GitHub repo ${repo.full_name} (${repo.id})`);
				}

				return c.text("Installation registered ✅");
			}
			break;
		case "installation_repositories":
			await handleInstallationRepositoriesEvent(payload);
			return c.text("Installation repositories updated ✅");
		case "issues":
			if (payload.action === "opened") {
				console.log(`🪶 Issue opened: #${payload.issue.number}`);

				// enqueue({
				// 	type: "issue_opened",
				// 	payload: {
				// 		installationId: payload.installation.id,
				// 		repoId: payload.repository.id,
				// 		repo: payload.repository.name,
				// 		owner: payload.repository.owner.login,
				// 		issue_number: payload.issue.number,
				// 	},
				// });

				enqueue({
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
					},
				});
			}
			break;

		case "issue_comment":
			if (payload.action === "created") {
				const issueNum = payload.issue.number;
				const commenter = payload.comment?.user?.login ?? "unknown";
				const body = payload.comment.body.trim();

				if (commenter.endsWith("[bot]")) return c.text("Ignored bot comment");

				console.log(`💬 Comment on #${issueNum} by ${commenter}`);

				// enqueue({
				// 	type: "issue_comment",
				// 	payload: {
				// 		installationId: payload.installation.id,
				// 		repoId: payload.repository.id,
				// 		repo: payload.repository.name,
				// 		owner: payload.repository.owner.login,
				// 		issue_number: issueNum,
				// 		body,
				// 	},
				// });

				enqueue({
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
					},
				});
			}
			break;

		case "pull_request":
			if (["opened", "synchronize", "closed"].includes(payload.action)) {
				const prNum = payload.pull_request.number;
				console.log(`🔀 PR #${prNum} (${payload.action})`);

				enqueue({
					type: "sayr_keyword_parse",
					payload: {
						text: payload.pull_request.body ?? "",
						title: payload.pull_request.title ?? "",
						owner: payload.repository.owner.login,
						repoId: payload.repository.id,
						repo: payload.repository.name,
						number: prNum,
						installationId: payload.installation.id,
						eventType: "pr",
						merged: payload.pull_request.merged ?? false,
					},
				});
			}
			break;

		default:
			break;
	}

	return c.text("✅ Job(s) received");
});

// biome-ignore lint/suspicious/noExplicitAny: <fix later>
async function handleInstallationRepositoriesEvent(payload: any) {
	const installationId = payload.installation.id;
	const owner = payload.installation.account?.login ?? "unknown";

	// --- Handle added repos ---
	if (payload.repositories_added?.length) {
		console.log(`📦 Adding ${payload.repositories_added.length} repo(s) for install ${installationId}`);

		for (const repo of payload.repositories_added) {
			const existing = await db.query.githubIntegration.findFirst({
				where: (g) => and(eq(g.installationId, installationId), eq(g.repoId, repo.id)),
			});

			if (!existing) {
				await db.insert(schema.githubIntegration).values({
					id: crypto.randomUUID(),
					installationId,
					repoId: repo.id,
					repoName: repo.name,
					owner,
				});
				console.log(`✅ Added repo: ${repo.full_name} (${repo.id})`);
			}
		}
	}

	// --- Handle removed repos ---
	if (payload.repositories_removed?.length) {
		console.log(`🗑 Removing ${payload.repositories_removed.length} repo(s) from install ${installationId}`);

		for (const repo of payload.repositories_removed) {
			await db
				.delete(schema.githubIntegration)
				.where(
					and(
						eq(schema.githubIntegration.installationId, installationId),
						eq(schema.githubIntegration.repoId, repo.id)
					)
				);
			console.log(`❌ Removed repo: ${repo.full_name} (${repo.id})`);
		}
	}
}
