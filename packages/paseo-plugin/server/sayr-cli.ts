import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { DEFAULT_CLI_BIN, type SayrSettings } from "../shared/settings";

const execFileAsync = promisify(execFile);

/** `sayr task view --json` output can run long (full comment threads); guard a runaway. */
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

function paseoHome(): string {
	return process.env.PASEO_HOME ?? join(homedir(), ".paseo");
}

function settingsPath(): string {
	return join(paseoHome(), "plugins", "sayr", "settings.json");
}

export async function readSettings(): Promise<SayrSettings> {
	try {
		const parsed: unknown = JSON.parse(await readFile(settingsPath(), "utf8"));
		const record = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
		const cliBin = record.cliBin;
		const defaultAgentInstructions = record.defaultAgentInstructions;
		const webUrlTemplate = record.webUrlTemplate;
		return {
			cliBin: typeof cliBin === "string" && cliBin.trim() !== "" ? cliBin.trim() : DEFAULT_CLI_BIN,
			defaultAgentInstructions: typeof defaultAgentInstructions === "string" ? defaultAgentInstructions : "",
			webUrlTemplate: typeof webUrlTemplate === "string" ? webUrlTemplate : "",
		};
	} catch {
		// No settings file yet, or one that's no longer parseable — either way,
		// the default (production `sayr`) is always a safe fallback.
		return { cliBin: DEFAULT_CLI_BIN, defaultAgentInstructions: "", webUrlTemplate: "" };
	}
}

export async function writeSettings(settings: SayrSettings): Promise<void> {
	const path = settingsPath();
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

/**
 * Shapes a shell-exec failure into a message worth showing a user, mirroring
 * the `describeGhFailure` pattern the installed `github-board` plugin uses
 * for the same problem against `gh`.
 */
function describeSayrFailure(error: unknown, cliBin: string): string {
	if (typeof error === "object" && error !== null && "code" in error) {
		if ((error as { code?: unknown }).code === "ENOENT") {
			return `\`${cliBin}\` is not installed, or not on the daemon's PATH (see packages/cli/README.md).`;
		}
	}
	const stderr =
		typeof error === "object" && error !== null && "stderr" in error
			? String((error as { stderr?: unknown }).stderr ?? "").trim()
			: "";
	// The CLI's own errors print as "✗ <message>" via printError() — strip the
	// glyph rather than showing it verbatim in plugin UI.
	const cleaned = stderr.replace(/^[✗x]\s*/i, "").trim();
	if (cleaned.includes("Not logged in")) {
		return `Not logged in. Run \`${cliBin} login --token <api-key>\` on the daemon machine.`;
	}
	if (cleaned !== "") return cleaned;
	return error instanceof Error ? error.message : String(error);
}

/**
 * Runs `<cliBin> ...args --json` and parses stdout. Every CLI read command
 * this plugin uses already supports `--json` (see `packages/cli/src/commands`),
 * so this is the one chokepoint every server handler goes through.
 */
export async function sayrJson<T>(args: readonly string[]): Promise<T> {
	const { cliBin } = await readSettings();
	try {
		const { stdout } = await execFileAsync(cliBin, [...args, "--json"], {
			maxBuffer: MAX_OUTPUT_BYTES,
		});
		return JSON.parse(stdout) as T;
	} catch (error) {
		throw new Error(describeSayrFailure(error, cliBin));
	}
}
