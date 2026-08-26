// Import the models submodule directly (not the package root) so this
// client bundle never pulls in the server-only Requesty client (client.ts
// reads process.env.REQUESTY_API_KEY and depends on @tanstack/ai-openrouter).
import { DEFAULT_MODEL_ID, REQUESTY_MODEL_CATALOG } from "@repo/ai/models";
import type { OrganizationSettings } from "@repo/database";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@repo/ui/components/accordion";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Tile, TileDescription, TileHeader, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Label } from "@repo/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Switch } from "@repo/ui/components/switch";
import { Textarea } from "@repo/ui/components/textarea";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { defaultOrgAiSettings, type OrgAiSettings } from "@repo/util";
import { IconDeviceFloppy, IconLock, IconSparkles } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLayoutData } from "@/components/admin/shell/context";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { updateOrganizationAction } from "@/lib/fetches/organization";

const CUSTOM_PROMPT_MAX_LENGTH = 500;
/** Must match `releaseNotesPrompt.maxCustomPromptLength`/`maxTemplateLength` in `@repo/ai-prompts`. */
const RELEASE_NOTES_CUSTOM_PROMPT_MAX_LENGTH = 500;
const RELEASE_NOTES_TEMPLATE_MAX_LENGTH = 1000;

/**
 * Feature id for the task-summary prompt — must match `taskSummaryPrompt.id`
 * in `@repo/ai-prompts`. Not imported directly: that package pulls in
 * `@repo/ai`'s server-only Requesty client transitively, which this
 * client bundle shouldn't carry. As more AI features ship, each gets its own
 * id here (and its own accordion section below) the same way.
 */
const TASK_SUMMARY_FEATURE_ID = "task-summary";
/** Feature id for the release-notes prompt — must match `releaseNotesPrompt.id`. */
const RELEASE_NOTES_FEATURE_ID = "release-notes";

/**
 * Per-kind toggles for the "Recommendations" feature — each is an
 * independent `featureToggles` key (missing = enabled), checked server-side
 * in `apps/backend/routes/api/internal/v1/ai/recommendations.ts`. Unlike
 * task-summary/release-notes, this feature has no model picker: it always
 * runs on a small, fixed model (never generates prose, just classifies
 * against closed candidate lists), so there's nothing for an org to choose.
 */
const RECOMMENDATION_KINDS: { id: string; label: string; description: string }[] = [
	{
		id: "recommend-labels",
		label: "Labels",
		description: "Suggest relevant labels from this organization's existing label library.",
	},
	{
		id: "recommend-assignees",
		label: "Assignees",
		description: "Suggest an assignee when a task's content gives a specific, concrete signal.",
	},
	{
		id: "recommend-priority",
		label: "Priority",
		description: "Suggest a priority change when a task's content signals real urgency or impact.",
	},
	{
		id: "recommend-category",
		label: "Category",
		description: "Suggest the best-matching category for a task.",
	},
	{
		id: "recommend-release",
		label: "Release",
		description: "Suggest a release when a task's content clearly ties it to that release's scope.",
	},
	{
		id: "recommend-relations",
		label: "Relations",
		description: "Flag likely duplicate, blocking, or related tasks from this organization's recent tasks.",
	},
	{
		id: "recommend-status",
		label: "Status",
		description:
			"Suggest moving a task to In Progress or Done based on linked GitHub activity — a linked branch, commit, mention, or merged PR.",
	},
];

export default function AiSettingsPage({ locked }: { locked?: boolean }) {
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const { organization, setOrganization } = useLayoutOrganizationSettings();
	const { account } = useLayoutData();

	const isAdmin = useMemo(() => {
		if (!account) return false;
		const currentMember = organization.members?.find((m) => m.userId === account.id);
		if (!currentMember?.teams) return false;
		return currentMember.teams.some((mt) => mt.team.permissions.admin.administrator);
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
	const [customPromptDraft, setCustomPromptDraft] = useState(aiSettings.taskSummaryCustomPrompt ?? "");
	const [customPromptSaving, setCustomPromptSaving] = useState(false);

	// Per-key saving state to prevent concurrent toggle race conditions.
	const [savingKeys, setSavingKeys] = useState<Set<keyof OrgAiSettings>>(new Set());
	// Always-current ref so toggle handlers don't close over stale aiSettings.
	const aiSettingsRef = useRef(aiSettings);
	const orgSettingsRef = useRef(orgSettings);
	const organizationRef = useRef(organization);
	useEffect(() => {
		aiSettingsRef.current = aiSettings;
	}, [aiSettings]);
	useEffect(() => {
		orgSettingsRef.current = orgSettings;
	}, [orgSettings]);
	useEffect(() => {
		organizationRef.current = organization;
	}, [organization]);

	// Sync draft when the org settings change externally (e.g. SSE-driven update).
	useEffect(() => {
		setCustomPromptDraft(aiSettings.taskSummaryCustomPrompt ?? "");
	}, [aiSettings.taskSummaryCustomPrompt]);

	const customPromptDirty = customPromptDraft.trim() !== (aiSettings.taskSummaryCustomPrompt ?? "").trim();

	// ---------------------------------------------------------------------------
	// Release notes template + custom instructions — same drafted-textarea
	// pattern as task-summary's custom prompt above, but backed by the generic
	// per-feature `templates`/`customPrompts` maps (OrgAiSettings) rather than
	// a dedicated field, since these are the first features to use that map.
	// ---------------------------------------------------------------------------
	const [releaseNotesTemplateDraft, setReleaseNotesTemplateDraft] = useState(
		aiSettings.templates?.[RELEASE_NOTES_FEATURE_ID] ?? ""
	);
	const [releaseNotesCustomPromptDraft, setReleaseNotesCustomPromptDraft] = useState(
		aiSettings.customPrompts?.[RELEASE_NOTES_FEATURE_ID] ?? ""
	);

	// Every successful save replaces `organization.settings` wholesale
	// (`setOrganization({ ...result.data, ... })`), which creates new
	// `templates`/`customPrompts` map identities even when this particular key
	// didn't change. Depending on the map itself would re-run these effects (and
	// discard an in-progress draft) on every unrelated save; depending on the
	// derived primitive string instead means React only resyncs the draft when
	// the actual persisted value at this key changes.
	const persistedTemplate = aiSettings.templates?.[RELEASE_NOTES_FEATURE_ID] ?? "";
	const persistedCustomPrompt = aiSettings.customPrompts?.[RELEASE_NOTES_FEATURE_ID] ?? "";
	useEffect(() => {
		setReleaseNotesTemplateDraft(persistedTemplate);
	}, [persistedTemplate]);
	useEffect(() => {
		setReleaseNotesCustomPromptDraft(persistedCustomPrompt);
	}, [persistedCustomPrompt]);

	const releaseNotesTemplateDirty = releaseNotesTemplateDraft.trim() !== persistedTemplate.trim();
	const releaseNotesCustomPromptDirty = releaseNotesCustomPromptDraft.trim() !== persistedCustomPrompt.trim();

	// ---------------------------------------------------------------------------
	// Handlers
	// ---------------------------------------------------------------------------
	/**
	 * Updates a single top-level `OrgAiSettings` scalar/object key.
	 *
	 * Sends `{ai: {[key]: value}}` as the network patch — never a spread of
	 * sibling keys — because `organization/update` now deep-merges whatever
	 * it's sent onto the row's *current* settings rather than replacing the
	 * column wholesale (see `deepMergeSettings` server-side). If this
	 * request instead sent `{...currentAi, [key]: value}`, a concurrent save
	 * from another tab touching a *different* key could be silently undone:
	 * this request's local copy of that other key might already be stale,
	 * and the server can't distinguish "the user meant to change this" from
	 * "this tab just hadn't refreshed yet." The optimistic local update
	 * below still merges into the full local copy, purely for immediate UI
	 * feedback — that's unrelated to what's sent over the wire.
	 */
	const updateAiSetting = useCallback(
		async <K extends keyof OrgAiSettings>(key: K, value: OrgAiSettings[K]) => {
			// Prevent concurrent saves for the same key
			if (savingKeys.has(key)) return;

			// Read latest values from refs to avoid stale closures
			const currentAi = aiSettingsRef.current;
			const currentOrgSettings = orgSettingsRef.current;
			const currentOrg = organizationRef.current;

			// Optimistic local update — full merge, just for immediate UI feedback.
			const optimisticAi: OrgAiSettings = { ...currentAi, [key]: value };
			const optimisticSettings: OrganizationSettings = { ...currentOrgSettings, ai: optimisticAi };
			setOrganization({ ...currentOrg, settings: optimisticSettings });
			setSavingKeys((prev) => new Set(prev).add(key));

			try {
				const result = await updateOrganizationAction(
					currentOrg.id,
					{
						name: currentOrg.name,
						slug: currentOrg.slug,
						shortId: currentOrg.shortId,
						logo: currentOrg.logo || undefined,
						bannerImg: currentOrg.bannerImg || undefined,
						description: currentOrg.description || undefined,
						// Scoped patch — only this one key, see doc comment above.
						settings: { ai: { [key]: value } },
					},
					sseClientId
				);

				if (result.success) {
					setOrganization({ ...result.data, members: currentOrg.members });
					headlessToast.success({ title: "Setting updated" });
				} else {
					setOrganization({ ...currentOrg, settings: currentOrgSettings });
					headlessToast.error({
						title: result.error || "Failed to update setting",
					});
				}
			} catch {
				setOrganization({ ...currentOrg, settings: currentOrgSettings });
				headlessToast.error({ title: "Failed to update setting" });
			} finally {
				setSavingKeys((prev) => {
					const next = new Set(prev);
					next.delete(key);
					return next;
				});
			}
		},
		[savingKeys, sseClientId, setOrganization]
	);

	/**
	 * Updates a single entry within one of `OrgAiSettings`' per-feature maps
	 * (`selectedModels`/`featureToggles`/`customPrompts`/`templates`), keyed
	 * by feature id — the map-valued counterpart to `updateAiSetting` above,
	 * same reasoning: sends only `{ai: {[mapKey]: {[featureId]: value}}}`,
	 * never a spread of the map's other entries, so a concurrent save
	 * touching a *different* feature's entry in the same map can't be
	 * clobbered by this tab's possibly-stale copy of it. The optimistic
	 * local update still merges into the full local map for correct
	 * immediate UI feedback across every feature's entry, not just this one.
	 */
	const updateAiMapEntry = useCallback(
		async <K extends "selectedModels" | "featureToggles" | "customPrompts" | "templates">(
			mapKey: K,
			featureId: string,
			value: string | boolean
		) => {
			if (savingKeys.has(mapKey)) return;

			const currentAi = aiSettingsRef.current;
			const currentOrgSettings = orgSettingsRef.current;
			const currentOrg = organizationRef.current;

			const optimisticMap = { ...currentAi[mapKey], [featureId]: value };
			const optimisticAi: OrgAiSettings = { ...currentAi, [mapKey]: optimisticMap };
			const optimisticSettings: OrganizationSettings = { ...currentOrgSettings, ai: optimisticAi };
			setOrganization({ ...currentOrg, settings: optimisticSettings });
			setSavingKeys((prev) => new Set(prev).add(mapKey));

			try {
				const result = await updateOrganizationAction(
					currentOrg.id,
					{
						name: currentOrg.name,
						slug: currentOrg.slug,
						shortId: currentOrg.shortId,
						logo: currentOrg.logo || undefined,
						bannerImg: currentOrg.bannerImg || undefined,
						description: currentOrg.description || undefined,
						// Scoped patch — only this one map entry, see doc comment above.
						settings: { ai: { [mapKey]: { [featureId]: value } } },
					},
					sseClientId
				);

				if (result.success) {
					setOrganization({ ...result.data, members: currentOrg.members });
					headlessToast.success({ title: "Setting updated" });
				} else {
					setOrganization({ ...currentOrg, settings: currentOrgSettings });
					headlessToast.error({
						title: result.error || "Failed to update setting",
					});
				}
			} catch {
				setOrganization({ ...currentOrg, settings: currentOrgSettings });
				headlessToast.error({ title: "Failed to update setting" });
			} finally {
				setSavingKeys((prev) => {
					const next = new Set(prev);
					next.delete(mapKey);
					return next;
				});
			}
		},
		[savingKeys, sseClientId, setOrganization]
	);

	const handleToggle = useCallback(
		(key: keyof OrgAiSettings, checked: boolean) => updateAiSetting(key, checked),
		[updateAiSetting]
	);

	const handleModelChange = useCallback(
		(featureId: string, modelId: string) => updateAiMapEntry("selectedModels", featureId, modelId),
		[updateAiMapEntry]
	);

	/**
	 * Generic per-feature enable toggle for AI features added after
	 * task-summary — writes to `OrgAiSettings.featureToggles` (missing entry
	 * = enabled). `task-summary` keeps using its own dedicated `taskSummary`
	 * boolean via `handleToggle` above rather than this.
	 */
	const handleFeatureToggle = useCallback(
		(featureId: string, checked: boolean) => updateAiMapEntry("featureToggles", featureId, checked),
		[updateAiMapEntry]
	);

	const handleSaveReleaseNotesTemplate = useCallback(
		() =>
			updateAiMapEntry(
				"templates",
				RELEASE_NOTES_FEATURE_ID,
				releaseNotesTemplateDraft.trim().slice(0, RELEASE_NOTES_TEMPLATE_MAX_LENGTH)
			),
		[updateAiMapEntry, releaseNotesTemplateDraft]
	);

	const handleSaveReleaseNotesCustomPrompt = useCallback(
		() =>
			updateAiMapEntry(
				"customPrompts",
				RELEASE_NOTES_FEATURE_ID,
				releaseNotesCustomPromptDraft.trim().slice(0, RELEASE_NOTES_CUSTOM_PROMPT_MAX_LENGTH)
			),
		[updateAiMapEntry, releaseNotesCustomPromptDraft]
	);

	const handleSaveCustomPrompt = useCallback(async () => {
		const trimmed = customPromptDraft.trim().slice(0, CUSTOM_PROMPT_MAX_LENGTH) || null;

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
					// Scoped patch — same reasoning as updateAiSetting above.
					settings: { ai: { taskSummaryCustomPrompt: trimmed } },
				},
				sseClientId
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
	}, [customPromptDraft, organization, sseClientId, setOrganization]);

	return (
		<div className="flex flex-col gap-6">
			{/* Pro plan required notice */}
			{locked && (
				<div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
					<IconSparkles className="size-3.5 shrink-0 mt-0.5" />
					<span>
						AI features require the{" "}
						<Link
							to="/settings/org/$orgId/billing"
							params={{ orgId: organization.id }}
							className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
						>
							Pro plan
						</Link>
						. Upgrade to enable AI task summaries, custom instructions, and more.
					</span>
				</div>
			)}

			{/* Read-only notice for non-admins */}
			{!isAdmin && !locked && (
				<div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
					<IconLock className="size-3.5 shrink-0" />
					<span>
						Only organization administrators can change these settings. You are viewing them in read-only mode.
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
								Master switch for all AI-powered features in this organization. Turning this off hides AI
								features for all members regardless of individual settings below.
							</TileDescription>
						</TileHeader>
						<div className="flex items-center justify-end pl-4">
							<Switch
								checked={!aiSettings.disabled}
								disabled={!isAdmin || locked || savingKeys.has("disabled")}
								onCheckedChange={(checked) => handleToggle("disabled", !checked)}
							/>
						</div>
					</Tile>
					<div className="border-t border-border mx-4" />
					<Tile className="md:w-full" variant="transparent">
						<TileHeader className="md:w-full">
							<TileTitle className="text-sm">Enable URL fetching</TileTitle>
							<TileDescription className="text-xs leading-normal!">
								Allow AI features that support it to fetch and read the content of external URLs found in task
								descriptions and comments (e.g. GitHub commits and PRs). May increase cost and response time.
								Only applies to features with URL fetch capability.
							</TileDescription>
						</TileHeader>
						<div className="flex items-center justify-end pl-4">
							<Switch
								checked={aiSettings.urlFetchEnabled ?? false}
								disabled={!isAdmin || aiSettings.disabled || locked || savingKeys.has("urlFetchEnabled")}
								onCheckedChange={(checked) => handleToggle("urlFetchEnabled", checked)}
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
										variant={aiSettings.taskSummary && !aiSettings.disabled ? "default" : "secondary"}
										className="text-xs"
									>
										{aiSettings.taskSummary && !aiSettings.disabled ? "Enabled" : "Disabled"}
									</Badge>
								</div>
							</AccordionTrigger>
							<AccordionContent className="px-0 pb-0 pt-0">
								<div className="flex flex-col">
									{/* Enable / disable row */}
									<div className="border-t border-border mx-4" />
									<Tile className="md:w-full" variant="transparent">
										<TileHeader className="md:w-full">
											<TileTitle className="text-sm">Enable task summaries</TileTitle>
											<TileDescription className="text-xs leading-normal!">
												Show an AI-generated summary panel on task detail pages. Members can generate a
												concise overview of the task based on its description and comments.
											</TileDescription>
										</TileHeader>
										<div className="flex items-center justify-end pl-4">
											<Switch
												checked={aiSettings.taskSummary}
												disabled={
													!isAdmin || aiSettings.disabled || locked || savingKeys.has("taskSummary")
												}
												onCheckedChange={(checked) => handleToggle("taskSummary", checked)}
											/>
										</div>
									</Tile>

									{/* Model — per-feature, not a shared org-wide default */}
									<div className="border-t border-border mx-4" />
									<Tile className="md:w-full" variant="transparent">
										<TileHeader className="md:w-full">
											<TileTitle className="text-sm">Model</TileTitle>
											<TileDescription className="text-xs leading-normal!">
												Choose which AI model generates task summaries. Available on the Pro plan — other
												orgs use the default model.
											</TileDescription>
										</TileHeader>
										<div className="flex items-center justify-end pl-4">
											<Select
												value={aiSettings.selectedModels?.[TASK_SUMMARY_FEATURE_ID] ?? DEFAULT_MODEL_ID}
												disabled={
													!isAdmin ||
													aiSettings.disabled ||
													!aiSettings.taskSummary ||
													locked ||
													savingKeys.has("selectedModels")
												}
												onValueChange={(modelId) => handleModelChange(TASK_SUMMARY_FEATURE_ID, modelId)}
											>
												<SelectTrigger size="sm" className="w-48">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{REQUESTY_MODEL_CATALOG.map((model) => (
														<SelectItem key={model.id} value={model.id}>
															{model.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									</Tile>

									{/* Custom instructions */}
									<div className="border-t border-border mx-4" />
									<Tile className="md:w-full flex-col! gap-4" variant="transparent">
										<div className="flex w-full items-start justify-between gap-4">
											<TileHeader className="md:w-full">
												<TileTitle className="text-sm">Custom instructions</TileTitle>
												<TileDescription className="text-xs leading-normal!">
													Provide tone and style guidance for AI-generated summaries (e.g. "Use formal
													language." or "Focus on business impact."). These instructions are appended after
													the core summarisation prompt and cannot override it.
												</TileDescription>
											</TileHeader>
										</div>
										<div className="flex w-full flex-col gap-2 pt-1">
											<Textarea
												placeholder="e.g. Use formal language. Keep summaries under 3 sentences."
												value={customPromptDraft}
												onChange={(e) =>
													setCustomPromptDraft(e.target.value.slice(0, CUSTOM_PROMPT_MAX_LENGTH))
												}
												rows={3}
												disabled={!isAdmin || aiSettings.disabled || !aiSettings.taskSummary || locked}
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
														disabled={customPromptSaving || !isAdmin || locked}
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

						<AccordionItem value="recommendations" className="border-none">
							<AccordionTrigger
								className="px-4 py-3 hover:no-underline hover:bg-accent rounded-lg transition-colors [&[data-state=open]]:rounded-b-none"
								showChevron={true}
							>
								<div className="flex items-center gap-2 flex-1 text-left">
									<span className="text-sm font-medium">Recommendations</span>
									<Badge
										variant={
											!aiSettings.disabled &&
											RECOMMENDATION_KINDS.some((k) => aiSettings.featureToggles?.[k.id] ?? true)
												? "default"
												: "secondary"
										}
										className="text-xs"
									>
										{!aiSettings.disabled &&
										RECOMMENDATION_KINDS.some((k) => aiSettings.featureToggles?.[k.id] ?? true)
											? "Enabled"
											: "Disabled"}
									</Badge>
								</div>
							</AccordionTrigger>
							<AccordionContent className="px-0 pb-0 pt-0">
								<div className="flex flex-col">
									<div className="px-4 pt-3 pb-1">
										<p className="text-xs text-muted-foreground leading-normal">
											Shown as a "Recommendations" section on task detail pages, generated automatically and
											cached — not button-triggered. Always uses a small, fixed model, since it only
											classifies against this organization's existing data rather than generating text.
										</p>
									</div>
									{RECOMMENDATION_KINDS.map((kind) => (
										<div key={kind.id} className="contents">
											<div className="border-t border-border mx-4" />
											<Tile className="md:w-full" variant="transparent">
												<TileHeader className="md:w-full">
													<TileTitle className="text-sm">{kind.label}</TileTitle>
													<TileDescription className="text-xs leading-normal!">
														{kind.description}
													</TileDescription>
												</TileHeader>
												<div className="flex items-center justify-end pl-4">
													<Switch
														checked={aiSettings.featureToggles?.[kind.id] ?? true}
														disabled={
															!isAdmin ||
															aiSettings.disabled ||
															locked ||
															savingKeys.has("featureToggles")
														}
														onCheckedChange={(checked) => handleFeatureToggle(kind.id, checked)}
													/>
												</div>
											</Tile>
										</div>
									))}
								</div>
							</AccordionContent>
						</AccordionItem>

						<AccordionItem value="release-notes" className="border-none">
							<AccordionTrigger
								className="px-4 py-3 hover:no-underline hover:bg-accent rounded-lg transition-colors [&[data-state=open]]:rounded-b-none"
								showChevron={true}
							>
								<div className="flex items-center gap-2 flex-1 text-left">
									<span className="text-sm font-medium">Release notes</span>
									<Badge
										variant={
											(aiSettings.featureToggles?.[RELEASE_NOTES_FEATURE_ID] ?? true) && !aiSettings.disabled
												? "default"
												: "secondary"
										}
										className="text-xs"
									>
										{(aiSettings.featureToggles?.[RELEASE_NOTES_FEATURE_ID] ?? true) && !aiSettings.disabled
											? "Enabled"
											: "Disabled"}
									</Badge>
								</div>
							</AccordionTrigger>
							<AccordionContent className="px-0 pb-0 pt-0">
								<div className="flex flex-col">
									<div className="border-t border-border mx-4" />
									<Tile className="md:w-full" variant="transparent">
										<TileHeader className="md:w-full">
											<TileTitle className="text-sm">Enable release notes</TileTitle>
											<TileDescription className="text-xs leading-normal!">
												Show a "Generate release notes with AI" action on release detail pages, drafted from
												the release's linked tasks.
											</TileDescription>
										</TileHeader>
										<div className="flex items-center justify-end pl-4">
											<Switch
												checked={aiSettings.featureToggles?.[RELEASE_NOTES_FEATURE_ID] ?? true}
												disabled={
													!isAdmin || aiSettings.disabled || locked || savingKeys.has("featureToggles")
												}
												onCheckedChange={(checked) =>
													handleFeatureToggle(RELEASE_NOTES_FEATURE_ID, checked)
												}
											/>
										</div>
									</Tile>

									<div className="border-t border-border mx-4" />
									<Tile className="md:w-full" variant="transparent">
										<TileHeader className="md:w-full">
											<TileTitle className="text-sm">Model</TileTitle>
											<TileDescription className="text-xs leading-normal!">
												Choose which AI model drafts release notes. Available on the Pro plan — other orgs
												use the default model.
											</TileDescription>
										</TileHeader>
										<div className="flex items-center justify-end pl-4">
											<Select
												value={aiSettings.selectedModels?.[RELEASE_NOTES_FEATURE_ID] ?? DEFAULT_MODEL_ID}
												disabled={
													!isAdmin ||
													aiSettings.disabled ||
													!(aiSettings.featureToggles?.[RELEASE_NOTES_FEATURE_ID] ?? true) ||
													locked ||
													savingKeys.has("selectedModels")
												}
												onValueChange={(modelId) => handleModelChange(RELEASE_NOTES_FEATURE_ID, modelId)}
											>
												<SelectTrigger size="sm" className="w-48">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{REQUESTY_MODEL_CATALOG.map((model) => (
														<SelectItem key={model.id} value={model.id}>
															{model.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									</Tile>

									{/* Template — desired output structure/sections */}
									<div className="border-t border-border mx-4" />
									<Tile className="md:w-full flex-col! gap-4" variant="transparent">
										<div className="flex w-full items-start justify-between gap-4">
											<TileHeader className="md:w-full">
												<TileTitle className="text-sm">Template</TileTitle>
												<TileDescription className="text-xs leading-normal!">
													Describe the structure you want release notes to follow (e.g. section headings
													like "## New Features" / "## Fixes" / "## Improvements"). Applied before custom
													instructions below.
												</TileDescription>
											</TileHeader>
										</div>
										<div className="flex w-full flex-col gap-2 pt-1">
											<Textarea
												placeholder={'e.g. "## New Features\\n## Improvements\\n## Bug Fixes"'}
												value={releaseNotesTemplateDraft}
												onChange={(e) =>
													setReleaseNotesTemplateDraft(
														e.target.value.slice(0, RELEASE_NOTES_TEMPLATE_MAX_LENGTH)
													)
												}
												rows={3}
												disabled={
													!isAdmin ||
													aiSettings.disabled ||
													!(aiSettings.featureToggles?.[RELEASE_NOTES_FEATURE_ID] ?? true) ||
													locked
												}
												className="resize-none text-sm bg-accent rounded-lg"
											/>
											<div className="flex items-center justify-between gap-2">
												<span className="text-xs text-muted-foreground">
													{releaseNotesTemplateDraft.length}/{RELEASE_NOTES_TEMPLATE_MAX_LENGTH}
												</span>
												{releaseNotesTemplateDirty && (
													<Button
														size="sm"
														variant="primary"
														className="h-7 px-2.5 text-xs"
														onClick={handleSaveReleaseNotesTemplate}
														disabled={savingKeys.has("templates") || !isAdmin || locked}
													>
														<IconDeviceFloppy className="size-3.5" />
														Save
													</Button>
												)}
											</div>
										</div>
									</Tile>

									{/* Custom instructions — tone/style guidance */}
									<div className="border-t border-border mx-4" />
									<Tile className="md:w-full flex-col! gap-4" variant="transparent">
										<div className="flex w-full items-start justify-between gap-4">
											<TileHeader className="md:w-full">
												<TileTitle className="text-sm">Custom instructions</TileTitle>
												<TileDescription className="text-xs leading-normal!">
													Provide tone and style guidance for AI-generated release notes (e.g. "Use a
													casual tone." or "Skip internal/technical changes."). Appended after the template
													above and cannot override the core prompt.
												</TileDescription>
											</TileHeader>
										</div>
										<div className="flex w-full flex-col gap-2 pt-1">
											<Textarea
												placeholder="e.g. Use a casual, friendly tone. Skip purely internal changes."
												value={releaseNotesCustomPromptDraft}
												onChange={(e) =>
													setReleaseNotesCustomPromptDraft(
														e.target.value.slice(0, RELEASE_NOTES_CUSTOM_PROMPT_MAX_LENGTH)
													)
												}
												rows={3}
												disabled={
													!isAdmin ||
													aiSettings.disabled ||
													!(aiSettings.featureToggles?.[RELEASE_NOTES_FEATURE_ID] ?? true) ||
													locked
												}
												className="resize-none text-sm bg-accent rounded-lg"
											/>
											<div className="flex items-center justify-between gap-2">
												<span className="text-xs text-muted-foreground">
													{releaseNotesCustomPromptDraft.length}/{RELEASE_NOTES_CUSTOM_PROMPT_MAX_LENGTH}
												</span>
												{releaseNotesCustomPromptDirty && (
													<Button
														size="sm"
														variant="primary"
														className="h-7 px-2.5 text-xs"
														onClick={handleSaveReleaseNotesCustomPrompt}
														disabled={savingKeys.has("customPrompts") || !isAdmin || locked}
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
