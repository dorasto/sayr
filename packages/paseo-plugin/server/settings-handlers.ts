import type { RpcInput } from "@getpaseo/plugin";
import type {
	getSettingsRpc,
	SayrSettings,
	setAgentInstructionsRpc,
	setCliBinRpc,
	setWebUrlTemplateRpc,
} from "../shared/settings";
import { readSettings, writeSettings } from "./sayr-cli";

/**
 * All three setters below do a read-modify-write against the same on-disk
 * settings file. Without serializing them, two concurrent RPC calls could
 * interleave between one's read and its write, and the second write would
 * silently clobber the first's change — neither call knows about the
 * other's in-flight update. A simple in-memory promise chain is enough to
 * make that safe within a single Node process.
 */
let settingsQueue: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
	const next = settingsQueue.then(fn, fn);
	settingsQueue = next.catch(() => {});
	return next;
}

export async function getSettings(_input: RpcInput<typeof getSettingsRpc>): Promise<SayrSettings> {
	return readSettings();
}

/** Merges into the existing settings rather than overwriting the whole file — otherwise setting one field would silently wipe out the other. */
export async function setCliBin(input: RpcInput<typeof setCliBinRpc>): Promise<SayrSettings> {
	return serialize(async () => {
		const current = await readSettings();
		const next = { ...current, cliBin: input.cliBin.trim() };
		await writeSettings(next);
		return next;
	});
}

export async function setAgentInstructions(input: RpcInput<typeof setAgentInstructionsRpc>): Promise<SayrSettings> {
	return serialize(async () => {
		const current = await readSettings();
		const next = { ...current, defaultAgentInstructions: input.defaultAgentInstructions };
		await writeSettings(next);
		return next;
	});
}

export async function setWebUrlTemplate(input: RpcInput<typeof setWebUrlTemplateRpc>): Promise<SayrSettings> {
	return serialize(async () => {
		const current = await readSettings();
		const next = { ...current, webUrlTemplate: input.webUrlTemplate.trim() };
		await writeSettings(next);
		return next;
	});
}
