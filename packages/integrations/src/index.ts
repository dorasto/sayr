import type { IntegrationManifest } from "./types";

const integrations = new Map<string, IntegrationManifest>();

export function registerIntegration(manifest: IntegrationManifest): void {
	integrations.set(manifest.id, manifest);
}

export function getIntegration(id: string): IntegrationManifest | undefined {
	return integrations.get(id);
}

export function getIntegrationList(): IntegrationManifest[] {
	return Array.from(integrations.values());
}

export type { IntegrationManifest, UIPage, UISection, UIField, ParsedSection } from "./types";
export type { CardSection, TabsSection, GridSection, ListSection, ListItemAction } from "./types";
