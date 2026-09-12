import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface CliConfig {
	token?: string;
	baseUrl?: string;
	defaultOrg?: string;
}

export const DEFAULT_BASE_URL = "https://api.sayr.io";

/**
 * `SAYR_PROFILE=<name>` isolates config into its own file — `~/.sayr/config.<name>.json`
 * instead of the default `~/.sayr/config.json` — so a login against one backend (e.g.
 * production) never gets clobbered by logging into another (e.g. a local dev instance).
 * `sayr-local` (see `index.local.ts`) is `sayr` with `SAYR_PROFILE=local` pre-set, so
 * "prod" and "local" stay two separate, unambiguous commands rather than a flag you
 * have to remember every time. Computed per-call (not cached) since it only ever reads
 * `process.env` once at CLI startup anyway, and this keeps tests/callers honest about
 * where a given read/write actually lands.
 */
export function getConfigPath(): string {
	const profile = process.env.SAYR_PROFILE?.trim();
	return profile ? join(homedir(), ".sayr", `config.${profile}.json`) : join(homedir(), ".sayr", "config.json");
}

export async function readConfig(): Promise<CliConfig> {
	try {
		const raw = await readFile(getConfigPath(), "utf8");
		return JSON.parse(raw) as CliConfig;
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
		throw err;
	}
}

export async function writeConfig(config: CliConfig): Promise<void> {
	const configPath = getConfigPath();
	await mkdir(dirname(configPath), { recursive: true });
	// mode 0o600: this file holds a bearer token — keep it owner-readable only.
	await writeFile(configPath, `${JSON.stringify(config, null, "\t")}\n`, { encoding: "utf8", mode: 0o600 });
}

export async function updateConfig(patch: Partial<CliConfig>): Promise<CliConfig> {
	const next = { ...(await readConfig()), ...patch };
	await writeConfig(next);
	return next;
}
