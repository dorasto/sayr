import { useEffect, useRef, useState } from "react";
import type { schema } from "@repo/database";
import { isAiFeatureEnabled, resolveOrgAiStatus } from "@repo/util";
import { Button } from "@repo/ui/components/button";
import { Spinner } from "@repo/ui/components/spinner";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/ui/components/collapsible";
import { IconSparkles, IconRefresh, IconChevronRight } from "@tabler/icons-react";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { suggestTaskLabels } from "@/lib/fetches/ai";
import { getLabelBulkUpdatePayload } from "@/components/tasks/actions/labels";
import { useTaskFieldAction } from "@/components/tasks/actions/use-task-field-action";
import { useLayoutData } from "@/components/generic/Context";
import { RenderLabel } from "../shared/label";

const SUGGEST_LABELS_FEATURE_ID = "suggest-labels";

interface AiRecommendationsProps {
	task: schema.TaskWithLabels;
	orgId: string;
	availableLabels: schema.labelType[];
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: schema.TaskWithLabels[]) => void;
	setSelectedTask: (newValue: schema.TaskWithLabels | null) => void;
	/** Org admins/owners get a "Regenerate" action and a "View prompt" debug panel; everyone else only ever sees a passive, cached result. */
	isProjectAdmin: boolean;
}

/**
 * "Recommendations" — a container for AI-suggested actions on a task,
 * auto-generated on load (like `AiTaskSummary`) rather than button-triggered,
 * with results cached server-side (see `suggest-labels.ts`'s Redis cache) so
 * repeat views are cheap and don't spam the model. Currently hosts one
 * recommendation kind (suggested labels); built so more kinds — related or
 * duplicate tasks, etc. — can be added as sibling blocks below without
 * restructuring this container.
 *
 * Regular members only ever see the passive, cached result — no controls,
 * and the whole section hides itself when there's nothing to show. Project
 * admins/owners additionally always see the section shell with a
 * "Regenerate" action (bypasses cache) and a "View prompt" debug panel,
 * mirroring `AiTaskSummary`'s own admin-only troubleshooting affordances.
 */
export function AiRecommendations({
	task,
	orgId,
	availableLabels,
	tasks,
	setTasks,
	setSelectedTask,
	isProjectAdmin,
}: AiRecommendationsProps) {
	const { aiEnabled, organizations } = useLayoutData();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const { execute } = useTaskFieldAction(task, tasks, setSelectedTask, setTasks, sseClientId);

	const [suggestedLabels, setSuggestedLabels] = useState<schema.labelType[]>([]);
	const [loading, setLoading] = useState(false);
	const [promptDebug, setPromptDebug] = useState<{ systemPrompt: string; userPrompt: string } | null>(null);
	const requestIdRef = useRef(0);

	const org = organizations.find((o) => o.id === orgId);
	const editionRaw = import.meta.env.VITE_SAYR_EDITION as string | undefined;
	const isOrgOnCloud = editionRaw === "cloud";
	const isOrgPro = org?.plan === "pro";
	const { aiDisabled, aiRateLimited } = resolveOrgAiStatus(org?.settings);
	const labelsFeatureAvailable =
		aiEnabled &&
		!(isOrgOnCloud && !isOrgPro) &&
		!aiDisabled &&
		!aiRateLimited &&
		isAiFeatureEnabled(org?.settings, SUGGEST_LABELS_FEATURE_ID) &&
		availableLabels.length > 0;

	const fetchLabelSuggestions = (forceRefresh: boolean) => {
		const myRequestId = ++requestIdRef.current;
		setLoading(true);
		if (forceRefresh) setPromptDebug(null);

		suggestTaskLabels(task.id, orgId, forceRefresh).then((result) => {
			if (requestIdRef.current !== myRequestId) return;
			setLoading(false);

			if (!result.success) {
				// Only surface a toast for the explicit admin regenerate — the
				// passive auto-load failing silently just means the section stays
				// hidden, which is preferable to an error toast on every page view.
				if (forceRefresh) {
					headlessToast.error({ title: "Couldn't suggest labels", description: result.error });
				}
				return;
			}

			const currentLabelIds = new Set((task.labels ?? []).map((l) => l.id));
			const matched = availableLabels.filter(
				(l) => result.data.labelIds.includes(l.id) && !currentLabelIds.has(l.id)
			);
			setSuggestedLabels(matched);
			if (result.data.systemPrompt && result.data.userPrompt) {
				setPromptDebug({ systemPrompt: result.data.systemPrompt, userPrompt: result.data.userPrompt });
			}

			// Same reasoning as above — only tell the admin explicitly that
			// nothing came back when they deliberately asked for a fresh check.
			if (forceRefresh && matched.length === 0) {
				headlessToast.info({
					title: "No labels suggested",
					description: result.data.reasoning || "AI didn't find any labels that clearly apply to this task.",
				});
			}
		});
	};

	// Auto-load on mount / task change — cache-aware server-side, so this is
	// cheap on repeat views and only actually regenerates when the task's
	// content (or its candidate labels) has changed since the last check.
	useEffect(() => {
		setSuggestedLabels([]);
		setPromptDebug(null);
		if (labelsFeatureAvailable) {
			fetchLabelSuggestions(false);
		}
		// fetchLabelSuggestions intentionally omitted — it closes over `task`/`availableLabels`,
		// which already drive this effect's own deps indirectly via task.id/orgId/labelsFeatureAvailable.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [task.id, orgId, labelsFeatureAvailable]);

	const applyLabel = (labelId: string) => {
		const currentLabelIds = (task.labels ?? []).map((l) => l.id);
		execute(getLabelBulkUpdatePayload(task, [...currentLabelIds, labelId], availableLabels, sseClientId));
		setSuggestedLabels((prev) => prev.filter((l) => l.id !== labelId));
	};

	const dismissLabel = (labelId: string) => {
		setSuggestedLabels((prev) => prev.filter((l) => l.id !== labelId));
	};

	const hasContent = suggestedLabels.length > 0;

	if (!labelsFeatureAvailable) return null;
	// Non-admins get a fully silent feature — no shell, no loading flash, only
	// ever appears once there's something to show. Admins always keep the
	// shell so the Regenerate/View-prompt controls stay reachable.
	if (!isProjectAdmin && !hasContent) return null;

	return (
		<div className="rounded-xl border border-dashed border-border bg-card p-3 flex flex-col gap-2">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
					<IconSparkles className="size-3.5" />
					<span>Recommendations</span>
				</div>
				{isProjectAdmin && (
					<Button
						variant="ghost"
						size="sm"
						className="h-6 px-2 text-xs"
						onClick={() => fetchLabelSuggestions(true)}
						disabled={loading}
					>
						{loading ? (
							<Spinner className="size-3" />
						) : (
							<>
								<IconRefresh size={12} className="mr-1" />
								Regenerate
							</>
						)}
					</Button>
				)}
			</div>

			{isProjectAdmin && promptDebug && (
				<Collapsible className="bg-accent p-3 rounded-lg max-w-prose w-fit">
					<CollapsibleTrigger asChild>
						<div className="flex items-center gap-1 group cursor-pointer w-fit">
							<IconChevronRight
								size={12}
								className="text-muted-foreground group-data-[state=open]:rotate-90 transition-transform"
							/>
							<span className="text-xs text-muted-foreground select-none">View prompt</span>
						</div>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<div className="flex flex-col gap-2 mt-1.5 max-h-48 overflow-y-auto">
							<pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono rounded-md px-3 py-2 leading-relaxed">
								{promptDebug.systemPrompt}
							</pre>
							<pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono rounded-md px-3 py-2 leading-relaxed">
								{promptDebug.userPrompt}
							</pre>
						</div>
					</CollapsibleContent>
				</Collapsible>
			)}

			{hasContent ? (
				<div className="flex flex-col gap-1.5">
					<span className="text-xs text-muted-foreground">Suggested labels</span>
					<div className="flex flex-wrap gap-2">
						{suggestedLabels.map((label) => (
							<RenderLabel
								key={label.id}
								label={label}
								showRemove
								onClick={(_, labelId) => applyLabel(labelId)}
								onRemove={dismissLabel}
							/>
						))}
					</div>
				</div>
			) : (
				isProjectAdmin && !loading && <p className="text-xs text-muted-foreground">No recommendations right now.</p>
			)}
		</div>
	);
}
