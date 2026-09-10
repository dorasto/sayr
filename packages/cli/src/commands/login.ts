import * as p from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../lib/client";
import { DEFAULT_BASE_URL, updateConfig } from "../lib/config";
import { printError } from "../lib/output";
import type { Me } from "../types";

interface LoginOptions {
	token?: string;
	baseUrl?: string;
}

export function registerLoginCommand(program: Command): void {
	program
		.command("login")
		.description("Authenticate the CLI with a Sayr personal access token")
		.option("--token <token>", "Personal access token (starts with api_) — generated from your Sayr account settings")
		.option(
			"--base-url <url>",
			`API base URL, e.g. http://localhost:5468 for local dev (default: ${DEFAULT_BASE_URL})`
		)
		.action(async (opts: LoginOptions) => {
			let token = opts.token;

			if (!token) {
				const answer = await p.password({
					message: "Paste your Sayr personal access token",
					validate: (value) => (value.trim().length === 0 ? "A token is required." : undefined),
				});
				if (p.isCancel(answer)) {
					p.cancel("Login cancelled.");
					process.exitCode = 1;
					return;
				}
				token = answer;
			}

			try {
				const me = await apiRequest<Me>("", { clientOptions: { token, baseUrl: opts.baseUrl } });
				await updateConfig({ token, ...(opts.baseUrl ? { baseUrl: opts.baseUrl } : {}) });
				console.log(`${pc.green("✓")} Logged in as ${pc.bold(me.name ?? me.email ?? me.id)}`);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
