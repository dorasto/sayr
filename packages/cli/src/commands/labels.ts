import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../lib/client";
import { printError, printJson } from "../lib/output";
import { resolveOrg } from "../lib/require-org";
import type { Label, TaskVisibility } from "../types";

export function registerLabelsCommand(program: Command): void {
	const labels = program.command("labels").description("Inspect and manage an organization's labels");

	labels
		.command("list")
		.description("List an organization's labels (public and private)")
		.option("--org <org>", "Organization slug or id")
		.option("--json", "Output raw JSON")
		.action(async (opts: { org?: string; json?: boolean }) => {
			try {
				const orgId = await resolveOrg(opts.org, opts);
				const result = await apiRequest<Label[]>("/labels", { query: { orgId } });

				if (opts.json) {
					printJson(result);
					return;
				}
				if (result.length === 0) {
					console.log(pc.dim("No labels found."));
					return;
				}
				for (const label of result) {
					const visibility = label.visible === "private" ? pc.dim("(private)") : "";
					console.log(`${pc.bold(label.name)} ${pc.dim(label.color ?? "")} ${visibility}`.trim());
				}
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});

	labels
		.command("create <name>")
		.description(
			"Create a label, or return the existing one if the name is already taken. Needs the manageLabels permission."
		)
		.option("--org <org>", "Organization slug or id")
		.option("--color <hex>", "Hex color, e.g. #3B82F6")
		.option("--visibility <visibility>", "public or private (default: public)")
		.option("--json", "Output raw JSON")
		.action(async (name: string, opts: { org?: string; color?: string; visibility?: string; json?: boolean }) => {
			try {
				if (opts.visibility !== undefined && opts.visibility !== "public" && opts.visibility !== "private") {
					throw new Error(`Invalid --visibility "${opts.visibility}": must be "public" or "private"`);
				}
				const orgId = await resolveOrg(opts.org, opts);
				const visible: TaskVisibility = opts.visibility === "private" ? "private" : "public";
				const result = await apiRequest<Label>("/labels", {
					method: "POST",
					body: { orgId, name, color: opts.color, visible },
				});

				if (opts.json) {
					printJson(result);
					return;
				}
				console.log(`${pc.green("✓")} ${pc.bold(result.name)} ${pc.dim(result.id)}`);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
