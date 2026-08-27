import type { Command } from "commander";
import pc from "picocolors";
import { CONFIG_PATH, readConfig, updateConfig } from "../lib/config";

export function registerConfigCommand(program: Command): void {
	const config = program.command("config").description("Manage local CLI configuration");

	config
		.command("get")
		.description("Show the current configuration")
		.action(async () => {
			const current = await readConfig();
			console.log(pc.dim(`Config file: ${CONFIG_PATH}`));
			console.log(`baseUrl:    ${current.baseUrl ?? "(default)"}`);
			console.log(`defaultOrg: ${current.defaultOrg ?? "(none)"}`);
			console.log(`token:      ${current.token ? `${current.token.slice(0, 8)}…` : "(not set)"}`);
		});

	config
		.command("set-org <org>")
		.description("Set the default organization slug used when --org is omitted")
		.action(async (org: string) => {
			await updateConfig({ defaultOrg: org });
			console.log(`${pc.green("✓")} Default organization set to ${pc.bold(org)}`);
		});

	config
		.command("set-base-url <url>")
		.description("Set the API base URL (e.g. http://localhost:5468 for local dev)")
		.action(async (url: string) => {
			await updateConfig({ baseUrl: url });
			console.log(`${pc.green("✓")} Base URL set to ${pc.bold(url)}`);
		});
}
