import { ApiClientError } from "./client";
import { readConfig } from "./config";
import { canPrompt, type InteractiveOptions, pickOrganization } from "./interactive";

/** Where the organization came from — one that wasn't given as a flag or a default has to be spelled out later. */
export type OrgSource = "flag" | "config" | "prompt";

export interface ResolvedOrg {
	org: string;
	source: OrgSource;
}

/**
 * Same as `resolveOrg`, but says where the answer came from — the guided commands use it to put `--org <slug>`
 * in the equivalent command they print, when (and only when) it wasn't already implied by the default org.
 */
export async function resolveOrgChoice(
	explicit: string | undefined,
	interactive: InteractiveOptions
): Promise<ResolvedOrg> {
	if (explicit) return { org: explicit, source: "flag" };

	const config = await readConfig();
	if (config.defaultOrg) return { org: config.defaultOrg, source: "config" };

	// Nothing to go on: a human at a terminal is asked; everyone else gets the error they always got.
	if (canPrompt(interactive)) {
		const picked = await pickOrganization();
		if (picked) return { org: picked, source: "prompt" };
	}

	throw new ApiClientError(
		"MISSING_ORG",
		"No organization specified. Pass --org <slug> or run `sayr config set-org <slug>`.",
		400
	);
}

/**
 * Falls back to the persisted default org (`sayr config set-org`) when `--org` is omitted, and, for a human at a
 * terminal with no default either, asks which organization (see `canPrompt`). `interactive` is the command's own
 * options object — required, so a command with `--json` can't forget to keep the prompt off its stdout.
 */
export async function resolveOrg(explicit: string | undefined, interactive: InteractiveOptions): Promise<string> {
	return (await resolveOrgChoice(explicit, interactive)).org;
}

/** The `--org` value to repeat in an equivalent command: unset when the default org already covers it. */
export function orgTipFlag(resolved: ResolvedOrg): string | undefined {
	return resolved.source === "config" ? undefined : resolved.org;
}
