import { formatTaskKey } from "@repo/util";
import type { Command } from "commander";
import pc from "picocolors";
import { apiRequestPaginated } from "../../lib/client";
import { resolveOrgShortId } from "../../lib/orgs";
import { printError, printJson, priorityBadge, statusBadge } from "../../lib/output";
import { resolveOrg } from "../../lib/require-org";
import { assertOneOf } from "../../lib/validate";
import type { Task } from "../../types";

const SORTS = ["newest", "trending", "mostPopular"] as const;

interface ListOptions {
	org?: string;
	query?: string;
	category?: string;
	includeClosed?: boolean;
	page?: string;
	limit?: string;
	sort?: string;
	json?: boolean;
}

export function registerListCommand(task: Command): void {
	task
		.command("list")
		.description("List tasks in an organization (always includes private tasks you're a member of)")
		.option("--org <org>", "Organization slug or id")
		.option("-q, --query <text>", "Search query")
		.option("--category <categoryId>", "Filter by category id")
		.option("--include-closed", "Include done/canceled tasks")
		.option("--page <page>", "Page number")
		.option("--limit <limit>", "Results per page (max 30)")
		.option("--sort <sort>", `Sort order (${SORTS.join(", ")}, default: mostPopular)`)
		.option("--json", "Output raw JSON")
		.action(async (opts: ListOptions) => {
			try {
				const orgId = await resolveOrg(opts.org);
				const sortBy = assertOneOf(opts.sort, SORTS, "--sort");

				const { data: tasks, pagination } = await apiRequestPaginated<Task[]>("/tasks", {
					query: {
						orgId,
						q: opts.query,
						categoryId: opts.category,
						includeClosed: opts.includeClosed,
						page: opts.page,
						limit: opts.limit,
						sortBy,
					},
				});

				if (opts.json) {
					printJson({ tasks, pagination });
					return;
				}

				if (tasks.length === 0) {
					console.log(pc.dim("No tasks found."));
					return;
				}

				const orgShortId = await resolveOrgShortId(orgId);
				for (const t of tasks) {
					const key = orgShortId ? formatTaskKey(orgShortId, t.shortId) : `#${t.shortId ?? "?"}`;
					console.log(
						`${pc.bold(key)}  ${statusBadge(t.status)}  ${priorityBadge(t.priority)}  ${t.title ?? pc.dim("(untitled)")}`
					);
				}
				console.log(
					pc.dim(`\nPage ${pagination.page} of ${pagination.totalPages} — ${pagination.totalItems} total`)
				);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
