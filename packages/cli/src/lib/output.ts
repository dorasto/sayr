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
