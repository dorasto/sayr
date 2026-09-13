import type { RpcInput } from "@getpaseo/plugin";
import type { getSettingsRpc, SayrSettings, setAgentInstructionsRpc, setCliBinRpc } from "../shared/settings";
import { readSettings, writeSettings } from "./sayr-cli";

export async function getSettings(_input: RpcInput<typeof getSettingsRpc>): Promise<SayrSettings> {
	return readSettings();
}

/** Merges into the existing settings rather than overwriting the whole file — otherwise setting one field would silently wipe out the other. */
export async function setCliBin(input: RpcInput<typeof setCliBinRpc>): Promise<SayrSettings> {
	const current = await readSettings();
	const next = { ...current, cliBin: input.cliBin.trim() };
	await writeSettings(next);
	return next;
}

export async function setAgentInstructions(input: RpcInput<typeof setAgentInstructionsRpc>): Promise<SayrSettings> {
	const current = await readSettings();
	const next = { ...current, defaultAgentInstructions: input.defaultAgentInstructions };
	await writeSettings(next);
	return next;
}
