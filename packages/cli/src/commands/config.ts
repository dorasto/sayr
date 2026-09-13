import type { Command } from "commander";
import pc from "picocolors";
import { DEFAULT_BASE_URL, getConfigPath, readConfig, updateConfig } from "../lib/config";
import { printJson } from "../lib/output";

export function registerConfigCommand(program: Command): void {
	const config = program.command("config").description("Manage local CLI configuration");

	config
		.command("get")
		.description("Show the current configuration")
		.option("--json", "Output raw JSON")
		.action(async (opts: { json?: boolean }) => {
			const current = await readConfig();
			// Same resolution order as the actual request path
			// (lib/client.ts's resolveConnection) — SAYR_BASE_URL can override
			// the stored value for a single command, so this reports what a
			// real request would actually use, not just what's on disk.
			const resolvedBaseUrl = (process.env.SAYR_BASE_URL ?? current.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");

			if (opts.json) {
				// Never emit the token itself, not even truncated — only whether one is set.
				printJson({
					baseUrl: resolvedBaseUrl,
					defaultOrg: current.defaultOrg ?? null,
					hasToken: Boolean(current.token),
				});
				return;
			}

			console.log(pc.dim(`Config file: ${getConfigPath()}`));
			console.log(`baseUrl:    ${resolvedBaseUrl}`);
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
