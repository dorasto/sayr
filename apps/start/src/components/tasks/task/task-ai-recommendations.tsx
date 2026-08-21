import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Spinner } from "@repo/ui/components/spinner";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { formatTaskKey, resolveOrgAiStatus } from "@repo/util";
import {
  IconAlertSquareFilled,
  IconArrowUpRight,
  IconCategory,
  IconChevronRight,
  IconCopy,
  IconLink,
  IconRefresh,
  IconRocket,
  IconSparkles,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useLayoutData } from "@/components/generic/Context";
import { getAssigneeBulkUpdatePayload } from "@/components/tasks/actions/assignees";
import { getCategoryUpdatePayload } from "@/components/tasks/actions/category";
import { getLabelBulkUpdatePayload } from "@/components/tasks/actions/labels";
import { getPriorityUpdatePayload } from "@/components/tasks/actions/priority";
import { getReleaseUpdatePayload } from "@/components/tasks/actions/release";
import { useTaskFieldAction } from "@/components/tasks/actions/use-task-field-action";
import {
  getTaskRecommendations,
  type RecommendationsResult,
  type RecommendedRelation,
} from "@/lib/fetches/ai";
import { createTaskRelationAction } from "@/lib/fetches/task";
import { RenderLabel } from "../shared/label";

const RELATION_ICONS: Record<RecommendedRelation["type"], React.ReactNode> = {
  blocking: <IconArrowUpRight className="size-3.5 text-destructive shrink-0" />,
  related: <IconLink className="size-3.5 text-muted-foreground shrink-0" />,
  duplicate: <IconCopy className="size-3.5 text-muted-foreground shrink-0" />,
};

const RELATION_LABELS: Record<RecommendedRelation["type"], string> = {
  blocking: "Blocking",
  related: "Related to",
  duplicate: "Dupe of",
};

interface SuggestionChipProps {
  icon?: React.ReactNode;
  label: string;
  onApply: () => void;
  onDismiss: () => void;
}

/** One reusable clickable chip shared by every recommendation kind — click the body to apply, the "x" to dismiss without applying. */
function SuggestionChip({
  icon,
  label,
  onApply,
  onDismiss,
}: SuggestionChipProps) {
  return (
    <Badge
      variant="secondary"
      className="flex items-center gap-1.5 bg-accent text-xs h-auto border border-dashed border-border rounded-2xl cursor-pointer pl-2 pr-1 py-1 max-w-52"
      onClick={onApply}
    >
      {icon}
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="rounded-sm hover:bg-muted p-0.5 shrink-0"
        aria-label="Dismiss suggestion"
      >
        <IconX size={12} />
      </button>
    </Badge>
  );
}

interface UseAiRecommendationsProps {
  task: schema.TaskWithLabels;
  orgId: string;
  availableLabels: schema.labelType[];
  availableUsers: schema.userType[];
  categories: schema.categoryType[];
  releases: schema.releaseType[];
  tasks: schema.TaskWithLabels[];
  setTasks: (newValue: schema.TaskWithLabels[]) => void;
  setSelectedTask: (newValue: schema.TaskWithLabels | null) => void;
}

/**
 * Drives the "Recommendations" feature across every kind it can surface —
 * labels, assignees, priority, category, release, and task relations.
 * Applying any suggestion goes through the same mutations the manual
 * pickers use (`getLabelBulkUpdatePayload`, `getPriorityUpdatePayload`,
 * etc., or `createTaskRelationAction` for relations) via the shared
 * `useTaskFieldAction` executor, then removes it from the local suggestion
 * list — no automatic refetch, matching how the labels-only version worked.
 *
 * Which kinds actually come back is entirely server-decided (per-kind
 * `OrgAiSettings.featureToggles`, checked in `recommendations.ts` — a
 * disabled kind just never appears in the response, same shape as "AI
 * legitimately found nothing"), so this hook doesn't duplicate that gating;
 * it only checks the shared org-level gates (AI enabled, plan, disabled,
 * rate-limited) to decide whether to call the endpoint at all.
 */
export function useAiRecommendations({
  task,
  orgId,
  availableLabels,
  availableUsers,
  categories,
  releases,
  tasks,
  setTasks,
  setSelectedTask,
}: UseAiRecommendationsProps) {
  const { aiEnabled, organizations } = useLayoutData();
  const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
  const { execute } = useTaskFieldAction(
    task,
    tasks,
    setSelectedTask,
    setTasks,
    sseClientId,
  );

  const [result, setResult] = useState<RecommendationsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [promptDebug, setPromptDebug] = useState<{
    systemPrompt: string;
    userPrompt: string;
  } | null>(null);
  const requestIdRef = useRef(0);

  const org = organizations.find((o) => o.id === orgId);
  const editionRaw = import.meta.env.VITE_SAYR_EDITION as string | undefined;
  const isOrgOnCloud = editionRaw === "cloud";
  const isOrgPro = org?.plan === "pro";
  const { aiDisabled, aiRateLimited } = resolveOrgAiStatus(org?.settings);
  const recommendationsAvailable =
    aiEnabled && !(isOrgOnCloud && !isOrgPro) && !aiDisabled && !aiRateLimited;

  const fetchRecommendations = (forceRefresh: boolean) => {
    const myRequestId = ++requestIdRef.current;
    setLoading(true);
    if (forceRefresh) setPromptDebug(null);

    getTaskRecommendations(task.id, orgId, forceRefresh).then((res) => {
      if (requestIdRef.current !== myRequestId) return;
      setLoading(false);

      if (!res.success) {
        if (forceRefresh) {
          headlessToast.error({
            title: "Couldn't generate recommendations",
            description: res.error,
          });
        }
        return;
      }

      setResult(res.data);
      if (res.data.systemPrompt && res.data.userPrompt) {
        setPromptDebug({
          systemPrompt: res.data.systemPrompt,
          userPrompt: res.data.userPrompt,
        });
      }

      const hasAny =
        res.data.labelIds.length > 0 ||
        res.data.assigneeIds.length > 0 ||
        res.data.priority ||
        res.data.categoryId ||
        res.data.releaseId ||
        res.data.relations.length > 0;

      if (forceRefresh && !hasAny) {
        headlessToast.info({
          title: "No recommendations",
          description:
            res.data.reasoning ||
            "AI didn't find anything to suggest for this task.",
        });
      }
    });
  };

  // Auto-load on mount / task change — see recommendations.ts's Redis cache
  // for why this is cheap on repeat views. Deliberately re-runs only on
  // task/org identity change, not on every render `fetchRecommendations` is
  // recreated — including it would re-trigger on every keystroke elsewhere
  // in the task, defeating the "auto-load once" point of this effect.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally scoped to task/org identity, not fetchRecommendations — see comment above.
  useEffect(() => {
    setResult(null);
    setPromptDebug(null);
    if (recommendationsAvailable) {
      fetchRecommendations(false);
    }
  }, [task.id, orgId, recommendationsAvailable]);

  const applyLabel = (labelId: string) => {
    const currentIds = (task.labels ?? []).map((l) => l.id);
    execute(
      getLabelBulkUpdatePayload(
        task,
        [...currentIds, labelId],
        availableLabels,
        sseClientId,
      ),
    );
    setResult(
      (prev) =>
        prev && {
          ...prev,
          labelIds: prev.labelIds.filter((id) => id !== labelId),
        },
    );
  };
  const dismissLabel = (labelId: string) =>
    setResult(
      (prev) =>
        prev && {
          ...prev,
          labelIds: prev.labelIds.filter((id) => id !== labelId),
        },
    );

  const applyAssignee = (userId: string) => {
    const currentIds = (task.assignees ?? []).map((a) => a.id);
    execute(
      getAssigneeBulkUpdatePayload(
        task,
        [...currentIds, userId],
        availableUsers,
        sseClientId,
      ),
    );
    setResult(
      (prev) =>
        prev && {
          ...prev,
          assigneeIds: prev.assigneeIds.filter((id) => id !== userId),
        },
    );
  };
  const dismissAssignee = (userId: string) =>
    setResult(
      (prev) =>
        prev && {
          ...prev,
          assigneeIds: prev.assigneeIds.filter((id) => id !== userId),
        },
    );

  const applyPriority = () => {
    if (!result?.priority) return;
    execute(getPriorityUpdatePayload(task, result.priority));
    setResult((prev) => prev && { ...prev, priority: null });
  };
  const dismissPriority = () =>
    setResult((prev) => prev && { ...prev, priority: null });

  const applyCategory = () => {
    if (!result?.categoryId) return;
    execute(getCategoryUpdatePayload(task, result.categoryId, categories));
    setResult((prev) => prev && { ...prev, categoryId: null });
  };
  const dismissCategory = () =>
    setResult((prev) => prev && { ...prev, categoryId: null });

  const applyRelease = () => {
    if (!result?.releaseId) return;
    execute(getReleaseUpdatePayload(task, result.releaseId, releases));
    setResult((prev) => prev && { ...prev, releaseId: null });
  };
  const dismissRelease = () =>
    setResult((prev) => prev && { ...prev, releaseId: null });

  const applyRelation = (relation: RecommendedRelation) => {
    execute({
      kind: "relation",
      actionId: `add-relation-${relation.taskId}`,
      apiFn: () =>
        createTaskRelationAction(
          task.organizationId,
          task.id,
          relation.taskId,
          relation.type,
          sseClientId,
        ),
      toastMessages: {
        loading: { title: "Adding relation..." },
        success: {
          title: "Relation added",
          description: `${RELATION_LABELS[relation.type]} ${relation.shortId ? formatTaskKey(org?.shortId ?? "", relation.shortId) : relation.title}`,
        },
        error: { title: "Failed to add relation" },
      },
    });
    setResult(
      (prev) =>
        prev && {
          ...prev,
          relations: prev.relations.filter((r) => r.taskId !== relation.taskId),
        },
    );
  };
  const dismissRelation = (taskId: string) =>
    setResult(
      (prev) =>
        prev && {
          ...prev,
          relations: prev.relations.filter((r) => r.taskId !== taskId),
        },
    );

  return {
    recommendationsAvailable,
    result,
    loading,
    promptDebug,
    fetchRecommendations,
    applyLabel,
    dismissLabel,
    applyAssignee,
    dismissAssignee,
    applyPriority,
    dismissPriority,
    applyCategory,
    dismissCategory,
    applyRelease,
    dismissRelease,
    applyRelation,
    dismissRelation,
  };
}

export type UseAiRecommendationsReturn = ReturnType<
  typeof useAiRecommendations
>;

interface AiRecommendationsContentProps {
  recommendations: UseAiRecommendationsReturn;
  availableLabels: schema.labelType[];
  availableUsers: schema.userType[];
  categories: schema.categoryType[];
  releases: schema.releaseType[];
  isProjectAdmin: boolean;
}

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

/** Renders just the recommendations content (header + suggestion chips), no outer card — used both standalone and embedded in the merged AI Insights card. */
function AiRecommendationsContent({
  recommendations: r,
  availableLabels,
  availableUsers,
  categories,
  releases,
  isProjectAdmin,
}: AiRecommendationsContentProps) {
  const suggestedLabels = (r.result?.labelIds ?? [])
    .map((id) => availableLabels.find((l) => l.id === id))
    .filter((l): l is schema.labelType => Boolean(l));
  const suggestedAssignees = (r.result?.assigneeIds ?? [])
    .map((id) => availableUsers.find((u) => u.id === id))
    .filter((u): u is schema.userType => Boolean(u));
  const suggestedCategory = r.result?.categoryId
    ? categories.find((c) => c.id === r.result?.categoryId)
    : null;
  const suggestedRelease = r.result?.releaseId
    ? releases.find((rel) => rel.id === r.result?.releaseId)
    : null;
  const suggestedRelations = r.result?.relations ?? [];

  const hasContent =
    suggestedLabels.length > 0 ||
    suggestedAssignees.length > 0 ||
    Boolean(r.result?.priority) ||
    Boolean(suggestedCategory) ||
    Boolean(suggestedRelease) ||
    suggestedRelations.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <IconSparkles className="" />
          <span>Recommendations</span>
        </div>
        {isProjectAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => r.fetchRecommendations(true)}
            disabled={r.loading}
          >
            {r.loading ? (
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

      {isProjectAdmin && r.promptDebug && (
        <Collapsible className="bg-accent p-3 rounded-lg max-w-prose w-fit">
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-1 group cursor-pointer w-fit">
              <IconChevronRight
                size={12}
                className="text-muted-foreground group-data-[state=open]:rotate-90 transition-transform"
              />
              <span className="text-xs text-muted-foreground select-none">
                View prompt
              </span>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-2 mt-1.5 max-h-48 overflow-y-auto">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono rounded-md px-3 py-2 leading-relaxed">
                {r.promptDebug.systemPrompt}
              </pre>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono rounded-md px-3 py-2 leading-relaxed">
                {r.promptDebug.userPrompt}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {hasContent ? (
        <div className="flex flex-col gap-2">
          {suggestedLabels.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-foreground font-semibold">
                  Labels:
                </span>
                {suggestedLabels.map((label) => (
                  <RenderLabel
                    key={label.id}
                    label={label}
                    showRemove
                    onClick={(_, labelId) => r.applyLabel(labelId)}
                    onRemove={r.dismissLabel}
                  />
                ))}
              </div>
            </div>
          )}

          {suggestedAssignees.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-foreground font-semibold">
                  Assignees:
                </span>
                {suggestedAssignees.map((user) => (
                  <SuggestionChip
                    key={user.id}
                    icon={
                      <IconUser className="size-3.5 text-muted-foreground" />
                    }
                    label={
                      user.displayName || user.name || user.email || "Unknown"
                    }
                    onApply={() => r.applyAssignee(user.id)}
                    onDismiss={() => r.dismissAssignee(user.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {r.result?.priority && (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-foreground font-semibold">
                  Priority:
                </span>
                <SuggestionChip
                  icon={
                    <IconAlertSquareFilled className="size-3.5 text-destructive" />
                  }
                  label={priorityLabels[r.result.priority] ?? r.result.priority}
                  onApply={r.applyPriority}
                  onDismiss={r.dismissPriority}
                />
              </div>
            </div>
          )}

          {suggestedCategory && (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-foreground font-semibold">
                  Category:
                </span>
                <SuggestionChip
                  icon={
                    <IconCategory className="size-3.5 text-muted-foreground" />
                  }
                  label={suggestedCategory.name}
                  onApply={r.applyCategory}
                  onDismiss={r.dismissCategory}
                />
              </div>
            </div>
          )}

          {suggestedRelease && (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-foreground font-semibold">
                  Release:
                </span>
                <SuggestionChip
                  icon={
                    <IconRocket className="size-3.5 text-muted-foreground" />
                  }
                  label={suggestedRelease.name}
                  onApply={r.applyRelease}
                  onDismiss={r.dismissRelease}
                />
              </div>
            </div>
          )}

          {suggestedRelations.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-foreground font-semibold">
                  Relations:
                </span>
                {suggestedRelations.map((relation) => (
                  <SuggestionChip
                    key={relation.taskId}
                    icon={RELATION_ICONS[relation.type]}
                    label={`${RELATION_LABELS[relation.type]}: ${relation.shortId} - ${relation.title}`}
                    onApply={() => r.applyRelation(relation)}
                    onDismiss={() => r.dismissRelation(relation.taskId)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        isProjectAdmin &&
        !r.loading && (
          <p className="text-xs text-muted-foreground">
            No recommendations right now.
          </p>
        )
      )}
    </div>
  );
}

interface AiRecommendationsProps extends UseAiRecommendationsProps {
  isProjectAdmin: boolean;
  /** When true, renders content only (no outer card) — used inside the merged AI Insights card. */
  embedded?: boolean;
}

/** Whether a fetched result has anything worth showing at all — cheap check on the raw ids/fields, no need to resolve them to display objects first. */
function hasAnyRecommendation(result: RecommendationsResult | null): boolean {
  if (!result) return false;
  return (
    result.labelIds.length > 0 ||
    result.assigneeIds.length > 0 ||
    Boolean(result.priority) ||
    Boolean(result.categoryId) ||
    Boolean(result.releaseId) ||
    result.relations.length > 0
  );
}

/**
 * Standalone "Recommendations" card. Wraps `AiRecommendationsContent` with
 * its own dashed-border card when used on its own (e.g. when task summaries
 * are disabled for the org, so there's nothing to merge it into) — pass
 * `embedded` to render just the content when composing it inside
 * `AiInsights` instead.
 *
 * Non-admins get a fully silent feature — the whole card (embedded or not)
 * only ever renders once there's something to show. Admins always keep it
 * reachable, so the Regenerate/View-prompt controls stay available.
 */
export function AiRecommendations({
  isProjectAdmin,
  embedded,
  ...hookProps
}: AiRecommendationsProps) {
  const recommendations = useAiRecommendations(hookProps);
  const shouldRender =
    recommendations.recommendationsAvailable &&
    (isProjectAdmin || hasAnyRecommendation(recommendations.result));

  if (!shouldRender) return null;

  const content = (
    <AiRecommendationsContent
      recommendations={recommendations}
      availableLabels={hookProps.availableLabels}
      availableUsers={hookProps.availableUsers}
      categories={hookProps.categories}
      releases={hookProps.releases}
      isProjectAdmin={isProjectAdmin}
    />
  );

  if (embedded) return content;

  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-3">
      {content}
    </div>
  );
}
