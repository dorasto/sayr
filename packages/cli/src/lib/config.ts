import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface CliConfig {
	token?: string;
	baseUrl?: string;
	defaultOrg?: string;
}

export const DEFAULT_BASE_URL = "https://api.sayr.io";

export const CONFIG_PATH = join(homedir(), ".sayr", "config.json");

export async function readConfig(): Promise<CliConfig> {
	try {
		const raw = await readFile(CONFIG_PATH, "utf8");
		return JSON.parse(raw) as CliConfig;
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
		throw err;
	}
}

export async function writeConfig(config: CliConfig): Promise<void> {
	await mkdir(dirname(CONFIG_PATH), { recursive: true });
	// mode 0o600: this file holds a bearer token — keep it owner-readable only.
	await writeFile(CONFIG_PATH, `${JSON.stringify(config, null, "\t")}\n`, { encoding: "utf8", mode: 0o600 });
}

export async function updateConfig(patch: Partial<CliConfig>): Promise<CliConfig> {
	const next = { ...(await readConfig()), ...patch };
	await writeConfig(next);
	return next;
}
