import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../lib/client";
import { printError, printJson } from "../lib/output";
import { resolveOrg } from "../lib/require-org";
import type { Category } from "../types";

export function registerCategoriesCommand(program: Command): void {
	const categories = program.command("categories").description("Inspect an organization's categories");

	categories
		.command("list")
		.description("List an organization's categories")
		.option("--org <org>", "Organization slug or id")
		.option("--json", "Output raw JSON")
		.action(async (opts: { org?: string; json?: boolean }) => {
			try {
				const orgId = await resolveOrg(opts.org);
				const result = await apiRequest<Category[]>("/categories", { query: { orgId } });

				if (opts.json) {
					printJson(result);
					return;
				}
				if (result.length === 0) {
					console.log(pc.dim("No categories found."));
					return;
				}
				for (const category of result) {
					console.log(`${pc.bold(category.name)} ${pc.dim(category.id)}`);
				}
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
