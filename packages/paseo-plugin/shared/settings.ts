import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const DEFAULT_CLI_BIN = "sayr";

/**
 * Which installed binary to shell out to — `sayr` (production) by default, or
 * e.g. `sayr-local` to point this plugin at a local dev backend instead (see
 * `packages/cli/README.md`'s `SAYR_PROFILE` section). A daemon-side JSON file
 * under `$PASEO_HOME/plugins/sayr/settings.json`, not `defineSettings`
 * (client-read/write only, no server read API) — the server handlers below
 * are the ones that actually need this value.
 */
export const SayrSettingsSchema = z.object({
	cliBin: z.string().min(1),
});
export type SayrSettings = z.output<typeof SayrSettingsSchema>;

export const getSettingsRpc = defineRpc({
	name: "sayr.settings.get",
	input: z.object({}),
	output: SayrSettingsSchema,
});

export const setCliBinRpc = defineRpc({
	name: "sayr.settings.set-cli-bin",
	input: z.object({ cliBin: z.string().min(1) }),
	output: SayrSettingsSchema,
});
