import { useCallback, useMemo } from "react";
import { Label } from "@repo/ui/components/label";
import { Switch } from "@repo/ui/components/switch";
import { headlessToast } from "@repo/ui/components/headless-toast";
import {
  Tile,
  TileHeader,
  TileTitle,
  TileAction,
  TileDescription,
} from "@repo/ui/components/doras-ui/tile";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconLock } from "@tabler/icons-react";
import type { OrganizationSettings } from "@repo/database";
import { type OrgAiSettings, defaultOrgAiSettings } from "@repo/util";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useLayoutData } from "@/components/generic/Context";
import { updateOrganizationAction } from "@/lib/fetches/organization";

export default function AiSettingsPage() {
  const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
  const { organization, setOrganization, permissions } =
    useLayoutOrganizationSettings();
  const { account } = useLayoutData();

  const isAdmin = useMemo(() => {
    if (!account) return false;
    const currentMember = organization.members?.find(
      (m) => m.userId === account.id,
    );
    if (!currentMember?.teams) return false;
    return currentMember.teams.some(
      (mt) => mt.team.permissions.admin.administrator,
    );
  }, [account, organization.members]);

  /** Effective AI settings — falls back to defaults for orgs without an `ai` key. */
  const aiSettings: OrgAiSettings = useMemo(() => {
    const stored = (organization.settings as OrganizationSettings | null)?.ai;
    return { ...defaultOrgAiSettings, ...stored };
  }, [organization.settings]);

  const orgSettings: OrganizationSettings = useMemo(() => {
    const stored = organization.settings as OrganizationSettings | null;
    return {
      allowActionsOnClosedTasks: true,
      publicActions: true,
      enablePublicPage: true,
      publicTaskAllowBlank: true,
      publicTaskFields: { labels: true, category: true, priority: true },
      ...stored,
    };
  }, [organization.settings]);

  const handleToggle = useCallback(
    async (key: keyof OrgAiSettings, checked: boolean) => {
      const updatedAi: OrgAiSettings = { ...aiSettings, [key]: checked };
      const updatedSettings: OrganizationSettings = {
        ...orgSettings,
        ai: updatedAi,
      };

      // Optimistic update
      setOrganization({ ...organization, settings: updatedSettings });

      try {
        const result = await updateOrganizationAction(
          organization.id,
          {
            name: organization.name,
            slug: organization.slug,
            shortId: organization.shortId,
            logo: organization.logo || undefined,
            bannerImg: organization.bannerImg || undefined,
            description: organization.description || undefined,
            settings: updatedSettings,
          },
          sseClientId,
        );

        if (result.success) {
          setOrganization({ ...result.data, members: organization.members });
          headlessToast.success({ title: "Setting updated" });
        } else {
          setOrganization({ ...organization, settings: orgSettings });
          headlessToast.error({
            title: result.error || "Failed to update setting",
          });
        }
      } catch {
        setOrganization({ ...organization, settings: orgSettings });
        headlessToast.error({ title: "Failed to update setting" });
      }
    },
    [organization, aiSettings, orgSettings, sseClientId, setOrganization],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Read-only notice for non-admins */}
      {!isAdmin && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
          <IconLock className="size-3.5 shrink-0" />
          <span>
            Only organization administrators can change these settings. You are
            viewing them in read-only mode.
          </span>
        </div>
      )}

      {/* Global AI toggle */}
      <div className="flex flex-col gap-3">
        <Label variant="subheading">General</Label>
        <div className="bg-card rounded-lg flex flex-col">
          <Tile className="md:w-full" variant="transparent">
            <TileHeader className="md:w-full">
              <TileTitle className="text-sm">Enable AI features</TileTitle>
              <TileDescription className="text-xs leading-normal!">
                Master switch for all AI-powered features in this organization.
                Turning this off hides AI features for all members regardless of
                individual settings below.
              </TileDescription>
            </TileHeader>
            <TileAction>
              <Switch
                checked={!aiSettings.disabled}
                disabled={!isAdmin}
                onCheckedChange={(checked) =>
                  handleToggle("disabled", !checked)
                }
              />
            </TileAction>
          </Tile>
        </div>
      </div>

      {/* Feature-level toggles */}
      <div className="flex flex-col gap-3">
        <Label variant="subheading">Features</Label>
        <div className="bg-card rounded-lg flex flex-col">
          <Tile className="md:w-full" variant="transparent">
            <TileHeader className="md:w-full">
              <TileTitle className="text-sm">Task summaries</TileTitle>
              <TileDescription className="text-xs leading-normal!">
                Show an AI-generated summary panel on task detail pages. Members
                can generate a concise overview of the task based on its
                description and comments.
              </TileDescription>
            </TileHeader>
            <TileAction>
              <Switch
                checked={aiSettings.taskSummary}
                disabled={!isAdmin || aiSettings.disabled}
                onCheckedChange={(checked) =>
                  handleToggle("taskSummary", checked)
                }
              />
            </TileAction>
          </Tile>
        </div>
      </div>
    </div>
  );
}
