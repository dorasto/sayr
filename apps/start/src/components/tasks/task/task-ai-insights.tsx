import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { resolveOrgAiStatus } from "@repo/util";
import { IconClock, IconLock, IconSparkles, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useLayoutData } from "@/components/generic/Context";
import { AiRecommendations } from "./task-ai-recommendations";
import { AiTaskSummary } from "./task-ai-summary";

interface AiInsightsProps {
	task: schema.TaskWithLabels;
	orgId: string;
	availableLabels: schema.labelType[];
	availableUsers: schema.userType[];
	categories: schema.categoryType[];
	releases: schema.releaseType[];
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: schema.TaskWithLabels[]) => void;
	setSelectedTask: (newValue: schema.TaskWithLabels | null) => void;
	isProjectAdmin: boolean;
}

function AiRateLimitedNotice({ until }: { until: Date | null }) {
	return (
		<div className="rounded-xl border border-dashed border-border bg-card p-3 flex flex-col gap-2">
			<div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
				<IconSparkles className="size-3.5" />
				<span>AI</span>
			</div>
			<div className="flex items-start gap-2 text-xs text-muted-foreground">
				<IconClock className="size-3.5 mt-0.5 shrink-0" />
				<span>
					AI features are temporarily unavailable for this organization
					{until ? (
						<>
							{" "}
							until{" "}
							<span className="font-mono">{until.toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
						</>
					) : null}
					.
				</span>
			</div>
		</div>
	);
}

const AI_UPSELL_DISMISSED_KEY = "sayr:ai-upsell-dismissed";

function AiProUpsell({ orgId }: { orgId: string }) {
	// Start hidden; show only after confirming the user hasn't dismissed it.
	const [dismissed, setDismissed] = useState(true);

	useEffect(() => {
		try {
			if (localStorage.getItem(AI_UPSELL_DISMISSED_KEY) !== "1") {
				setDismissed(false);
			}
		} catch {
			setDismissed(false);
		}
	}, []);

	const dismiss = useCallback(() => {
		try {
			localStorage.setItem(AI_UPSELL_DISMISSED_KEY, "1");
		} catch {
			// ignore
		}
		setDismissed(true);
	}, []);

	if (dismissed) return null;

	return (
		<div className="rounded-xl border border-dashed border-border bg-card p-3 flex flex-col gap-2">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
					<IconSparkles className="size-3.5" />
					<span>AI</span>
				</div>
				<Button
					variant="ghost"
					size="sm"
					className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
					onClick={dismiss}
					aria-label="Dismiss"
				>
					<IconX className="size-3" />
				</Button>
			</div>
			<div className="flex items-start gap-2 text-xs text-muted-foreground">
				<IconLock className="size-3.5 mt-0.5 shrink-0" />
				<span>
					AI features are available on the{" "}
					<a
						href={`/settings/org/${orgId}/billing`}
						className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
					>
						Pro plan
					</a>
					. Upgrade to unlock AI-powered summaries, recommendations, and more.
				</span>
			</div>
		</div>
	);
}

/**
 * "AI Insights" — the merged card hosting the task's AI Summary and
 * Recommendations sections. Computes the org-wide gates (AI enabled, plan,
 * disabled, rate-limited) once, shared by both sections, so the org only
 * ever sees ONE upsell/rate-limited notice rather than one per feature.
 *
 * When task summaries are enabled, both sections render together inside one
 * dashed-border card, divided by a rule between them (Tailwind's `divide-y`
 * — since it only inserts a border between DOM nodes that actually render,
 * a section returning nothing still leaves a clean single-section card, no
 * manual "only show the divider if both have content" bookkeeping needed).
 *
 * When task summaries are disabled for the org, there's nothing to merge
 * Recommendations into, so it falls back to rendering as its own standalone
 * card exactly as before.
 */
export function AiInsights({
	task,
	orgId,
	availableLabels,
	availableUsers,
	categories,
	releases,
	tasks,
	setTasks,
	setSelectedTask,
	isProjectAdmin,
}: AiInsightsProps) {
	const { aiEnabled, organizations } = useLayoutData();

	if (!aiEnabled) return null;

	const org = organizations.find((o) => o.id === orgId);
	const editionRaw = import.meta.env.VITE_SAYR_EDITION as string | undefined;
	const isOrgOnCloud = editionRaw === "cloud";
	const isOrgPro = org?.plan === "pro";
	if (isOrgOnCloud && !isOrgPro) {
		return <AiProUpsell orgId={orgId} />;
	}

	const { aiDisabled, aiRateLimited, rateLimitUntil, taskSummaryEnabled } = resolveOrgAiStatus(org?.settings);
	if (aiDisabled) return null;
	if (aiRateLimited) return <AiRateLimitedNotice until={rateLimitUntil} />;

	const recommendationsProps = {
		task,
		orgId,
		availableLabels,
		availableUsers,
		categories,
		releases,
		tasks,
		setTasks,
		setSelectedTask,
		isProjectAdmin,
	};

	if (!taskSummaryEnabled) {
		// Nothing to merge Recommendations into — render it standalone (own card).
		return <AiRecommendations {...recommendationsProps} />;
	}

	return (
		<div className="rounded-xl border border-dashed border-border bg-card p-3 flex flex-col divide-y divide-border [&>*+*]:pt-3">
			<AiTaskSummary task={task} orgId={orgId} embedded />
			<AiRecommendations {...recommendationsProps} embedded />
		</div>
	);
}
