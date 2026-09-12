import type { RpcInput } from "@getpaseo/plugin";
import type { getSettingsRpc, SayrSettings, setCliBinRpc } from "../shared/settings";
import { readSettings, writeSettings } from "./sayr-cli";

export async function getSettings(_input: RpcInput<typeof getSettingsRpc>): Promise<SayrSettings> {
	return readSettings();
}

export async function setCliBin(input: RpcInput<typeof setCliBinRpc>): Promise<SayrSettings> {
	const next = { cliBin: input.cliBin.trim() };
	await writeSettings(next);
	return next;
}
