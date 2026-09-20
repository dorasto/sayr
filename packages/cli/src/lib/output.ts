import pc from "picocolors";
import { ApiClientError } from "./client";

export function printJson(value: unknown): void {
	console.log(JSON.stringify(value, null, 2));
}

export function printError(err: unknown): void {
	if (err instanceof ApiClientError) {
		console.error(`${pc.red("✗")} ${err.message}`);
		if (process.env.SAYR_DEBUG) console.error(pc.dim(`  (${err.code}, status ${err.status})`));
		return;
	}
	if (err instanceof Error) {
		console.error(`${pc.red("✗")} ${err.message}`);
		return;
	}
	console.error(`${pc.red("✗")} ${String(err)}`);
}

export function statusBadge(status: string): string {
	switch (status) {
		case "done":
			return pc.green(status);
		case "canceled":
			return pc.dim(status);
		case "in-progress":
			return pc.cyan(status);
		case "todo":
			return pc.yellow(status);
		default:
			return status;
	}
}

/** Release lifecycle badge — `statusBadge` above is task-only (different status set). */
export function releaseStatusBadge(status: string): string {
	switch (status) {
		case "released":
			return pc.green(status);
		case "in-progress":
			return pc.yellow(status);
		case "planned":
			return pc.blue(status);
		case "archived":
			return pc.dim(status);
		default:
			return status;
	}
}

/** Release status-update health badge. */
export function healthBadge(health: string): string {
	switch (health) {
		case "on_track":
			return pc.green(health);
		case "at_risk":
			return pc.yellow(health);
		case "off_track":
			return pc.red(health);
		default:
			return health;
	}
}

/** GitHub PR state badge — `merged` wins over `state: "closed"`, since a merged PR is also closed. */
export function pullRequestBadge(pr: { state: string; merged: boolean }): string {
	if (pr.merged) return pc.magenta("merged");
	return pr.state === "open" ? pc.green("open") : pc.red(pr.state);
}

/**
 * `YYYY-MM-DD` in UTC. Deliberately not `@repo/util`'s `formatDate`: that one
 * formats in the local timezone, so a UTC-midnight release date (what
 * `--target-date 2026-10-31` stores) would render a day early west of UTC.
 * Unparseable input is returned untouched.
 */
export function formatIsoDate(iso: string): string {
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? iso : date.toISOString().slice(0, 10);
}

export function priorityBadge(priority: string): string {
	switch (priority) {
		case "urgent":
			return pc.red(priority);
		case "high":
			return pc.yellow(priority);
		case "medium":
			return pc.cyan(priority);
		default:
			return pc.dim(priority);
	}
}
