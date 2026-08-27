import { ApiClientError } from "./client";
import { readConfig } from "./config";

/** Falls back to the persisted default org (`sayr config set-org`) when `--org` is omitted. */
export async function resolveOrg(explicit?: string): Promise<string> {
	if (explicit) return explicit;

	const config = await readConfig();
	if (config.defaultOrg) return config.defaultOrg;

	throw new ApiClientError(
		"MISSING_ORG",
		"No organization specified. Pass --org <slug> or run `sayr config set-org <slug>`.",
		400
	);
}
