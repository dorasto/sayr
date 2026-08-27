import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../lib/client";
import { printError, printJson } from "../lib/output";
import type { Me } from "../types";

export function registerWhoamiCommand(program: Command): void {
	program
		.command("whoami")
		.description("Show the currently authenticated user")
		.option("--json", "Output raw JSON")
		.action(async (opts: { json?: boolean }) => {
			try {
				const me = await apiRequest<Me>("");
				if (opts.json) {
					printJson(me);
					return;
				}
				console.log(`${pc.bold(me.name ?? "(no name)")} ${pc.dim(`<${me.email ?? "no email"}>`)}`);
				console.log(pc.dim(`id: ${me.id}`));
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
