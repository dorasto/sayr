import type { IntegrationManifest } from "./types";

const globalKey = "__INTEGRATION_REGISTRY__";

if (!(globalThis as any)[globalKey]) {
    (globalThis as any)[globalKey] = new Map<string, IntegrationManifest>();
}

const integrations: Map<string, IntegrationManifest> =
    (globalThis as any)[globalKey];

export function registerIntegration(manifest: IntegrationManifest): void {
    const enabled =
        process.env[`INTEGRATION_${manifest.id.toUpperCase()}_ENABLED`] === "true";

    if (!enabled) {
        console.log(
            `Integration '${manifest.id}' is DISABLED via env and was NOT registered. ` +
            `Enable it by setting INTEGRATION_${manifest.id.toUpperCase()}_ENABLED=true`
        );
        return;
    }

    integrations.set(manifest.id, manifest);

    const authorName = manifest.author?.name ?? "Unknown author";

    console.log(
        `Integration '${manifest.id}' loaded successfully: ${manifest.name} (version ${manifest.version}) by ${authorName}.`
    );

    if (manifest.requiresExternalService) {
        console.log(
            `Note: '${manifest.id}' requires an external service to be running. ${manifest.externalServiceNote ?? ""}`
        );
    }
}

export function getIntegration(id: string): IntegrationManifest | undefined {
    return integrations.get(id);
}

export function getIntegrationList(): IntegrationManifest[] {
    return Array.from(integrations.values());
}

export type {
    IntegrationManifest,
    UIPage,
    UISection,
    UIField,
    ParsedSection
} from "./types";
export type {
    CardSection,
    TabsSection,
    GridSection,
    ListSection,
    ListItemAction
} from "./types";