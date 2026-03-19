import { dequeue, type JobGroups } from "@repo/queue";
import { handleComment, handleSayrKeywordParse } from "./github";
import { handleGithubCommitRef } from "./github/commitRef";
import {
	handleGithubBranchDelete,
	handleGithubBranchLink,
	handleGithubPullRequestClosed,
	handleGithubPullRequestLink,
	handleGithubPullRequestSync,
} from "./github/pullRequest";

import { gdprExportWorker } from "./main/gdpr";

import { withTraceContext } from "@repo/opentelemetry/trace";
import { initTracing } from "@repo/opentelemetry";

import { CronJob } from "cron";
import { db, schema } from "@repo/database";
import { lt } from "drizzle-orm";

/* ============================================================
   Environment
   ============================================================ */
const APP_ENV = process.env.APP_ENV;
const env =
	APP_ENV === "production" || APP_ENV === "development"
		? APP_ENV
		: "development";

let shuttingDown = false;

/* ============================================================
   Graceful Shutdown
   ============================================================ */
const initiateShutdown = (signal: string) => {
	shuttingDown = true;
	console.log(`🛑 ${signal} received, shutting down...`);
};

process.on("SIGTERM", () => initiateShutdown("SIGTERM"));
process.on("SIGINT", () => initiateShutdown("SIGINT"));

/* ============================================================
   Cron Jobs (Main Worker Only)
   ============================================================ */
function initMainCronJobs() {
	console.log("⏰ Starting main worker cron jobs...");

	// Daily cleanup of expired invites (older than 24h)
	new CronJob(
		"0 0 * * *",
		async () => {
			try {
				const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

				await db
					.delete(schema.invite)
					.where(lt(schema.invite.expiresAt, cutoff));

				console.log("🧹 Cleaned expired invites (older than 24h)");
			} catch (err) {
				console.error("❌ Cron error deleting invites:", err);
			}
		},
		null,
		true,
	);
}

/* ============================================================
   GitHub Job Processor
   ============================================================ */
async function processGithubJob(job: JobGroups["github"]) {
	switch (job.type) {
		case "sayr_keyword_parse":
			return handleSayrKeywordParse(job);

		case "issue_comment":
			return handleComment(job);

		case "github_commit_ref":
			return handleGithubCommitRef(job);

		case "pull_request_link":
			return handleGithubPullRequestLink(job);

		case "pull_request_sync":
			return handleGithubPullRequestSync(job);

		case "pull_request_closed":
			return handleGithubPullRequestClosed(job);

		case "branch_create":
			return handleGithubBranchLink(job);

		case "branch_delete":
			return handleGithubBranchDelete(job);

		default:
			console.warn(`⚠️ Unhandled GitHub job type: ${job.type}`);
	}
}

/* ============================================================
   Main Job Processor
   ============================================================ */
async function processMainJob(job: JobGroups["main"]) {
	switch (job.type) {
		case "gdpr_export":
			return gdprExportWorker(job);

		default:
			console.warn(`⚠️ Unhandled main job type: ${job.type}`);
	}
}

/* ============================================================
   Generic Job Handler
   ============================================================ */
async function handleJob<G extends keyof JobGroups>(
	group: G,
	job: JobGroups[G],
) {
	const traceContext = "traceContext" in job ? job.traceContext : undefined;

	try {
		await withTraceContext(
			traceContext,
			`worker.${group}.${job.type}`,
			async () => {
				if (group === "github")
					return processGithubJob(job as JobGroups["github"]);
				if (group === "main") return processMainJob(job as JobGroups["main"]);
				console.warn(`⚠️ No handler defined for group "${group}"`);
			},
		);
	} catch (err) {
		console.error(`❌ [${group}] ${job.type} failed:`, err);
	}
}

/* ============================================================
   Utilities
   ============================================================ */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* ============================================================
   Worker Loop
   ============================================================ */
async function workerLoop<G extends keyof JobGroups>(group: G) {
	const MODE = env === "production" ? "redis" : "file";
	console.log(`⚙️ Worker for "${group}" started (${MODE} mode)`);

	let idleMs = 100;

	while (!shuttingDown) {
		try {
			const job = await dequeue(group);

			if (shuttingDown) break;

			if (!job) {
				if (MODE === "file") {
					await sleep(idleMs);
					idleMs = Math.min(idleMs * 2, 5000);
				}
				continue;
			}

			idleMs = 100;
			await handleJob(group, job);
		} catch (err) {
			console.error(`❌ Worker error in group "${group}":`, err);
			await sleep(1000);
		}
	}

	console.log(`✅ Worker for "${group}" stopped cleanly`);
}

/* ============================================================
   Main Entrypoint
   ============================================================ */
async function main() {
	const groupArg = process.argv[2] as keyof JobGroups | undefined;

	if (!groupArg) {
		console.error(
			"❌ Missing group argument.\nUsage: bun run dev-<group>\nExample: bun run dev-github , bun run dev-main",
		);
		process.exit(1);
	}

	if (!["github", "main"].includes(groupArg)) {
		console.error(`❌ Unknown group "${groupArg}".`);
		process.exit(1);
	}

	// Start cron jobs ONLY for "main"
	if (groupArg === "main") {
		initMainCronJobs();
	}

	// Health check
	const HEALTH_PORT = Number.parseInt(process.env.HEALTH_PORT || "8080");
	Bun.serve({
		port: HEALTH_PORT,
		fetch() {
			return new Response("ok", { status: 200 });
		},
	});
	console.log(`🩺 Health check listening on :${HEALTH_PORT}`);

	initTracing(`sayr-worker-${groupArg}`);
	await workerLoop(groupArg);
}

main();
