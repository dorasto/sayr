import * as p from "@clack/prompts";
import { ApiClientError } from "./client";

interface ConfirmOptions {
	/** `--yes`: proceed without asking. */
	yes?: boolean;
	/** `--json`: stdout has to stay machine-readable, and clack draws its prompt on stdout. */
	json?: boolean;
}

/**
 * Throws `CONFIRMATION_REQUIRED` when an irreversible action has no way to be
 * confirmed: `--json` without `--yes` (the prompt would corrupt the JSON on
 * stdout), or no interactive terminal without `--yes`. Call it BEFORE the
 * first network round trip so a refused command never touches the API.
 */
export function assertCanConfirm(opts: ConfirmOptions): void {
	if (opts.yes) return;

	if (opts.json) {
		throw new ApiClientError(
			"CONFIRMATION_REQUIRED",
			"This command needs confirmation, which can't be combined with --json. Re-run with --yes to confirm.",
			400
		);
	}
	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		throw new ApiClientError(
			"CONFIRMATION_REQUIRED",
			"This command needs confirmation but there is no interactive terminal. Re-run with --yes to confirm.",
			400
		);
	}
}

/**
 * Asks before an irreversible action. `--yes` proceeds straight away;
 * otherwise a clack prompt that defaults to "no". Resolves `false` when the
 * user declines or cancels (Ctrl+C) — the caller decides how to report that.
 */
export async function confirmDestructive(message: string, opts: ConfirmOptions): Promise<boolean> {
	if (opts.yes) return true;
	assertCanConfirm(opts);

	const answer = await p.confirm({ message, initialValue: false });
	// A cancelled prompt resolves to a symbol, never `true`.
	return answer === true;
}
