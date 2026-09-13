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
	cliBin: z.string().trim().min(1),
	/** Prefilled into "Send to agent"'s instructions field — edited further per-send there, never sent as-is without a chance to change it. */
	defaultAgentInstructions: z.string().default(""),
	/**
	 * Overrides "Open on Sayr"'s auto-derived URL (`shared/web-url.ts`'s
	 * `deriveTaskWebUrl`) when set — an escape hatch for a self-hosted setup
	 * that doesn't follow the `api.<domain>` / `<org>.<domain>` convention at
	 * all. Empty string (the default) means "use the derived URL". Supports
	 * `{org}`/`{shortId}` placeholders, e.g. `https://tasks.example.com/{org}/{shortId}`.
	 */
	webUrlTemplate: z.string().default(""),
});
export type SayrSettings = z.output<typeof SayrSettingsSchema>;

export const getSettingsRpc = defineRpc({
	name: "sayr.settings.get",
	input: z.object({}),
	output: SayrSettingsSchema,
});

export const setCliBinRpc = defineRpc({
	name: "sayr.settings.set-cli-bin",
	input: z.object({ cliBin: z.string().trim().min(1) }),
	output: SayrSettingsSchema,
});

export const setAgentInstructionsRpc = defineRpc({
	name: "sayr.settings.set-agent-instructions",
	input: z.object({ defaultAgentInstructions: z.string() }),
	output: SayrSettingsSchema,
});

export const setWebUrlTemplateRpc = defineRpc({
	name: "sayr.settings.set-web-url-template",
	input: z.object({ webUrlTemplate: z.string() }),
	output: SayrSettingsSchema,
});
