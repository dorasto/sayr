import type { Command } from "commander";
import pc from "picocolors";
import { writeConfig } from "../lib/config";

export function registerLogoutCommand(program: Command): void {
	program
		.command("logout")
		.description("Remove the locally stored Sayr credentials")
		.action(async () => {
			await writeConfig({});
			console.log(`${pc.green("✓")} Logged out.`);
		});
}
