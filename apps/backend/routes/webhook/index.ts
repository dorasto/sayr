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
		case "issues":
			if (payload.action === "opened") {
				console.log(`🪶 Issue opened: #${payload.issue.number}`);

				enqueue({
					type: "issue_opened",
					payload: {
						installationId: payload.installation.id,
						repo: payload.repository.name,
						owner: payload.repository.owner.login,
						issue_number: payload.issue.number,
					},
				});

				enqueue({
					type: "sayr_keyword_parse",
					payload: {
						text: payload.issue.body ?? "",
						title: payload.issue.title ?? "",
						owner: payload.repository.owner.login,
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

				enqueue({
					type: "issue_comment",
					payload: {
						installationId: payload.installation.id,
						repo: payload.repository.name,
						owner: payload.repository.owner.login,
						issue_number: issueNum,
						body,
					},
				});

				enqueue({
					type: "sayr_keyword_parse",
					payload: {
						text: body,
						title: "",
						owner: payload.repository.owner.login,
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
