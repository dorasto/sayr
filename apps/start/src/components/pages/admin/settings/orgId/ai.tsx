import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Switch } from "@repo/ui/components/switch";
import { Textarea } from "@repo/ui/components/textarea";
import { headlessToast } from "@repo/ui/components/headless-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui/components/accordion";
import {
  Tile,
  TileHeader,
  TileTitle,
  TileDescription,
} from "@repo/ui/components/doras-ui/tile";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconDeviceFloppy, IconLock } from "@tabler/icons-react";
import { Badge } from "@repo/ui/components/badge";
import type { OrganizationSettings } from "@repo/database";
import { type OrgAiSettings, defaultOrgAiSettings } from "@repo/util";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useLayoutData } from "@/components/generic/Context";
import { updateOrganizationAction } from "@/lib/fetches/organization";

const CUSTOM_PROMPT_MAX_LENGTH = 500;

export default function AiSettingsPage() {
  const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
  const { organization, setOrganization } = useLayoutOrganizationSettings();
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

  // ---------------------------------------------------------------------------
  // Custom prompt local state — kept in sync with the persisted value via effect
  // ---------------------------------------------------------------------------
  const [customPromptDraft, setCustomPromptDraft] = useState(
    aiSettings.taskSummaryCustomPrompt ?? "",
  );
  const [customPromptSaving, setCustomPromptSaving] = useState(false);

  // Sync draft when the org settings change externally (e.g. SSE-driven update).
  useEffect(() => {
    setCustomPromptDraft(aiSettings.taskSummaryCustomPrompt ?? "");
  }, [aiSettings.taskSummaryCustomPrompt]);

  const customPromptDirty =
    customPromptDraft.trim() !==
    (aiSettings.taskSummaryCustomPrompt ?? "").trim();

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
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

  const handleSaveCustomPrompt = useCallback(async () => {
    const trimmed =
      customPromptDraft.trim().slice(0, CUSTOM_PROMPT_MAX_LENGTH) || null;
    const updatedAi: OrgAiSettings = {
      ...aiSettings,
      taskSummaryCustomPrompt: trimmed,
    };
    const updatedSettings: OrganizationSettings = {
      ...orgSettings,
      ai: updatedAi,
    };

    setCustomPromptSaving(true);
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
        headlessToast.success({ title: "Custom instructions saved" });
      } else {
        headlessToast.error({
          title: result.error || "Failed to save custom instructions",
        });
      }
    } catch {
      headlessToast.error({ title: "Failed to save custom instructions" });
    } finally {
      setCustomPromptSaving(false);
    }
  }, [
    customPromptDraft,
    aiSettings,
    orgSettings,
    organization,
    sseClientId,
    setOrganization,
  ]);

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
            <div className="flex items-center justify-end pl-4">
              <Switch
                checked={!aiSettings.disabled}
                disabled={!isAdmin}
                onCheckedChange={(checked) =>
                  handleToggle("disabled", !checked)
                }
              />
            </div>
          </Tile>
          <div className="border-t border-border mx-4" />
          <Tile className="md:w-full" variant="transparent">
            <TileHeader className="md:w-full">
              <TileTitle className="text-sm">Enable web search</TileTitle>
              <TileDescription className="text-xs leading-normal!">
                Allow AI features that support it to search the web for
                up-to-date information. Uses a web-search agent and may increase
                cost and response time. Only applies to features with web search
                capability.
              </TileDescription>
            </TileHeader>
            <div className="flex items-center justify-end pl-4">
              <Switch
                checked={aiSettings.webSearchEnabled ?? false}
                disabled={!isAdmin || aiSettings.disabled}
                onCheckedChange={(checked) =>
                  handleToggle("webSearchEnabled", checked)
                }
              />
            </div>
          </Tile>
        </div>
      </div>

      {/* Feature-level settings */}
      <div className="flex flex-col gap-3">
        <Label variant="subheading">Features</Label>
        <div className="bg-card rounded-lg">
          <Accordion type="single" collapsible>
            <AccordionItem value="task-summaries" className="border-none">
              <AccordionTrigger
                className="px-4 py-3 hover:no-underline hover:bg-accent rounded-lg transition-colors [&[data-state=open]]:rounded-b-none"
                showChevron={true}
              >
                <div className="flex items-center gap-2 flex-1 text-left">
                  <span className="text-sm font-medium">Task summaries</span>
                  <Badge
                    variant={
                      aiSettings.taskSummary && !aiSettings.disabled
                        ? "default"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {aiSettings.taskSummary && !aiSettings.disabled
                      ? "Enabled"
                      : "Disabled"}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-0 pt-0">
                <div className="flex flex-col">
                  {/* Enable / disable row */}
                  <div className="border-t border-border mx-4" />
                  <Tile className="md:w-full" variant="transparent">
                    <TileHeader className="md:w-full">
                      <TileTitle className="text-sm">
                        Enable task summaries
                      </TileTitle>
                      <TileDescription className="text-xs leading-normal!">
                        Show an AI-generated summary panel on task detail pages.
                        Members can generate a concise overview of the task
                        based on its description and comments.
                      </TileDescription>
                    </TileHeader>
                    <div className="flex items-center justify-end pl-4">
                      <Switch
                        checked={aiSettings.taskSummary}
                        disabled={!isAdmin || aiSettings.disabled}
                        onCheckedChange={(checked) =>
                          handleToggle("taskSummary", checked)
                        }
                      />
                    </div>
                  </Tile>

                  {/* Custom instructions */}
                  <div className="border-t border-border mx-4" />
                  <Tile
                    className="md:w-full flex-col! gap-4"
                    variant="transparent"
                  >
                    <div className="flex w-full items-start justify-between gap-4">
                      <TileHeader className="md:w-full">
                        <TileTitle className="text-sm">
                          Custom instructions
                        </TileTitle>
                        <TileDescription className="text-xs leading-normal!">
                          Provide tone and style guidance for AI-generated
                          summaries (e.g. "Use formal language." or "Focus on
                          business impact."). These instructions are appended
                          after the core summarisation prompt and cannot
                          override it.
                        </TileDescription>
                      </TileHeader>
                    </div>
                    <div className="flex w-full flex-col gap-2 pt-1">
                      <Textarea
                        placeholder="e.g. Use formal language. Keep summaries under 3 sentences."
                        value={customPromptDraft}
                        onChange={(e) =>
                          setCustomPromptDraft(
                            e.target.value.slice(0, CUSTOM_PROMPT_MAX_LENGTH),
                          )
                        }
                        rows={3}
                        disabled={
                          !isAdmin ||
                          aiSettings.disabled ||
                          !aiSettings.taskSummary
                        }
                        className="resize-none text-sm bg-accent rounded-lg"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {customPromptDraft.length}/{CUSTOM_PROMPT_MAX_LENGTH}
                        </span>
                        {customPromptDirty && (
                          <Button
                            size="sm"
                            variant="primary"
                            className="h-7 px-2.5 text-xs"
                            onClick={handleSaveCustomPrompt}
                            disabled={customPromptSaving || !isAdmin}
                          >
                            <IconDeviceFloppy className="size-3.5" />
                            Save
                          </Button>
                        )}
                      </div>
                    </div>
                  </Tile>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
