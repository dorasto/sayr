import { IconBrandDiscord, IconPlug } from "@tabler/icons-react";

export interface IntegrationConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Return a URL string if this integration activity has a link, or null if not. */
  getUrl: (data: any) => string | null;
  className?: string;
}

export const INTEGRATION_REGISTRY: Record<string, IntegrationConfig> = {
  discordbot: {
    id: "discordbot",
    label: "Discord",
    icon: <IconBrandDiscord className="h-4 w-4 shrink-0" />,
    getUrl: (data) => data?.url ?? null,
    className: "bg-discord text-white hover:bg-discord/80 hover:border-discord",
  },
};

/** Generic fallback config for unknown integration IDs that have a URL. */
const FALLBACK_CONFIG = (id: string): IntegrationConfig => ({
  id,
  label: "Open",
  icon: <IconPlug className="h-4 w-4 shrink-0" />,
  getUrl: (data) => data?.url ?? null,
  className: "bg-muted",
});

export interface MatchedIntegration {
  config: IntegrationConfig;
  activity: any;
}

/**
 * Returns matched integrations from an activity array where fromValue === "sidebar".
 * Known IDs use the registry config. Unknown IDs fall back to a generic config
 * only if toValue.data.url exists.
 */
export function getMatchedIntegrations(
  activities: any[],
): MatchedIntegration[] {
  return activities
    .filter((e) => e.fromValue === "sidebar" && e.toValue?.data?.url)
    .flatMap((e) => {
      const integrationId = e.toValue?.id;
      const known = integrationId
        ? INTEGRATION_REGISTRY[integrationId]
        : undefined;
      if (known) {
        return [{ config: known, activity: e }];
      }
      // Unknown or missing ID: fall back to generic config since we already know url exists
      return [
        {
          config: FALLBACK_CONFIG(
            integrationId ?? e.toValue?.name ?? "unknown",
          ),
          activity: e,
        },
      ];
    });
}
