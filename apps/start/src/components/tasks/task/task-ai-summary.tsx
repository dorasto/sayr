import type { schema } from "@repo/database";
import { resolveOrgAiStatus, formatDateTimeFromNow } from "@repo/util";
import { Button } from "@repo/ui/components/button";
import { Spinner } from "@repo/ui/components/spinner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import {
  IconSparkles,
  IconRefresh,
  IconChevronRight,
  IconInfoCircle,
  IconClock,
  IconLock,
  IconX,
} from "@tabler/icons-react";
import { useState, useEffect, useRef, useCallback } from "react";
import parse from "html-react-parser";
import {
  streamSummarizeTask,
  fetchTaskSummaryStatus,
  type AiPromptDebugInfo,
} from "@/lib/fetches/ai";
import { renderMarkdown } from "@/lib/markdown";
import { useLayoutData } from "@/components/generic/Context";
import {
  Tile,
  TileDescription,
  TileHeader,
  TileIcon,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";

interface AiTaskSummaryProps {
  task: schema.TaskWithLabels;
  orgId: string;
}

function AiRateLimitedNotice({ until }: { until: Date | null }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-3 flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <IconSparkles className="size-3.5" />
        <span>AI Summary</span>
      </div>
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <IconClock className="size-3.5 mt-0.5 shrink-0" />
        <span>
          AI features are temporarily unavailable for this organization
          {until ? (
            <>
              {" "}
              until{" "}
              <span className="font-mono">
                {until.toLocaleDateString(undefined, { dateStyle: "medium" })}
              </span>
            </>
          ) : null}
          .
        </span>
      </div>
    </div>
  );
}

const AI_UPSELL_DISMISSED_KEY = "sayr:ai-upsell-dismissed";

function AiProUpsell() {
  // Start hidden; show only after confirming the user hasn't dismissed it.
  // This avoids a flash-of-content on page load for users who already dismissed.
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
          <span>AI Summary</span>
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
            href="/settings/billing"
            className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
          >
            Pro plan
          </a>
          . Upgrade to unlock AI-powered task summaries and more.
        </span>
      </div>
    </div>
  );
}

export function AiTaskSummary({ task, orgId }: AiTaskSummaryProps) {
  const { account, organizations, aiEnabled } = useLayoutData();
  const [summary, setSummary] = useState<string | null>(null);
  const [renderedHtml, setRenderedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptDebug, setPromptDebug] = useState<AiPromptDebugInfo | null>(
    null,
  );
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  // Track the latest summary string so the async render doesn't overwrite a
  // newer result with a stale one when chunks arrive quickly.
  const latestSummaryRef = useRef<string | null>(null);
  // Frozen at mount — staleness is not re-evaluated while the panel stays open.
  const mountHashRef = useRef<string | null>(null);
  // Stable ref to handleGenerate so the mount effect can call it without
  // listing it as a dependency (avoids infinite re-trigger).
  const handleGenerateRef = useRef<() => void>(() => {});

  // Re-render markdown whenever the summary text changes.
  useEffect(() => {
    if (!summary) {
      setRenderedHtml(null);
      return;
    }
    const snap = summary;
    renderMarkdown(snap).then(({ markup }) => {
      // Only apply if this result is still current.
      if (latestSummaryRef.current === snap) {
        setRenderedHtml(markup);
      }
    });
  }, [summary]);

  // On mount (or when the task id changes), check for a cached summary.
  // If fresh → display it. If stale or missing → auto-generate.
  // The effect intentionally only depends on task.id so that live updates
  // (WS-driven prop changes) while the panel is open do not trigger re-evaluation.
  useEffect(() => {
    let cancelled = false;

    async function checkCache() {
      const status = await fetchTaskSummaryStatus(task.id, orgId);

      if (cancelled) return;

      if (status.hasCachedSummary && !status.isStale && status.summary) {
        // Fresh cache hit — populate directly, no generation needed.
        mountHashRef.current = status.generatedAt;
        latestSummaryRef.current = status.summary;
        setSummary(status.summary);
        setGeneratedAt(status.generatedAt);
      } else {
        // Stale or no cache — auto-generate.
        handleGenerateRef.current();
      }
    }

    checkCache();

    return () => {
      cancelled = true;
    };
  }, [task.id, orgId]);

  const handleGenerate = (forceRefresh = false) => {
    setSummary(null);
    setRenderedHtml(null);
    setError(null);
    setLoading(true);
    setPromptDebug(null);
    setGeneratedAt(null);
    latestSummaryRef.current = null;

    streamSummarizeTask(
      task.id,
      orgId,
      (info) => {
        setPromptDebug(info);
      },
      (chunk) => {
        setSummary((prev) => {
          const next = (prev ?? "") + chunk;
          latestSummaryRef.current = next;
          return next;
        });
      },
      () => {}, // citations no longer emitted — noop
      () => {
        setLoading(false);
        setGeneratedAt(new Date().toISOString());
      },
      (err: string) => {
        setError(err);
        setLoading(false);
      },
      forceRefresh,
    );
  };

  // Keep the ref current so the mount effect always calls the latest version.
  handleGenerateRef.current = handleGenerate;

  // Hide if AI is not available on this instance
  if (!aiEnabled) {
    return null;
  }

  // Resolve AI status from org settings
  const org = organizations.find((o) => o.id === orgId);

  // On cloud, AI is a Pro plan feature. Show upsell for free orgs.
  const editionRaw = import.meta.env.VITE_SAYR_EDITION as string | undefined;
  const isOrgOnCloud = editionRaw === "cloud";
  const isOrgPro = org?.plan === "pro";
  if (isOrgOnCloud && !isOrgPro) {
    return <AiProUpsell />;
  }

  const { aiDisabled, aiRateLimited, rateLimitUntil, taskSummaryEnabled } =
    resolveOrgAiStatus(org?.settings);

  // Disabled entirely — hide the component
  if (aiDisabled || !taskSummaryEnabled) {
    return null;
  }

  // Rate limited — show informational placeholder
  if (aiRateLimited) {
    return <AiRateLimitedNotice until={rateLimitUntil} />;
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-3 flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <IconSparkles className="size-3.5" />
          <span>AI Summary</span>
        </div>
        {account.role === "admin" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => handleGenerate(true)}
            disabled={loading}
          >
            {loading ? (
              <Spinner className="size-3" />
            ) : summary ? (
              <>
                <IconRefresh size={12} className="mr-1" />
                Regenerate
              </>
            ) : (
              <>
                <IconSparkles size={12} className="mr-1" />
                Generate
              </>
            )}
          </Button>
        )}
      </div>

      {/* Prompt preview — admin only, collapsed by default */}
      {account.role === "admin" && summary && (
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
            {promptDebug ? (
              <div className="flex flex-col gap-2 mt-1.5 max-h-48 overflow-y-auto">
                <div>
                  <div className="flex items-center gap-1.5 px-3 pt-1 pb-0.5">
                    <span className="text-xs text-muted-foreground font-mono">
                      url_fetch:{" "}
                      <span className={promptDebug.urlFetchEnabled ? "text-green-500" : "text-destructive"}>
                        {promptDebug.urlFetchEnabled ? `enabled (${promptDebug.urlCount ?? 0} url${(promptDebug.urlCount ?? 0) !== 1 ? "s" : ""})` : "disabled"}
                      </span>
                    </span>
                  </div>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono rounded-md px-3 py-2 leading-relaxed">
                    {promptDebug.systemPrompt}
                  </pre>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono rounded-md px-3 py-2 leading-relaxed">
                    {promptDebug.userPrompt}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1.5 italic">
                Generate a summary to see the prompt sent to Mistral.
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {(renderedHtml || (loading && summary)) && (
        <div className="text-sm text-foreground leading-relaxed [&_strong]:font-semibold [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_p]:leading-relaxed [&_p+p]:mt-2">
          {renderedHtml ? parse(renderedHtml) : summary}
          {loading && (
            <span className="ml-0.5 inline-block w-0.5 h-3.5 bg-foreground/60 animate-pulse align-middle" />
          )}
        </div>
      )}

      {renderedHtml && !loading && (
        <Tile className="border border-primary/30 rounded-lg py-1">
          <TileHeader>
            <div className="flex items-center gap-1">
              <TileIcon className="bg-transparent border-transparent">
                <IconInfoCircle />
              </TileIcon>
              <TileTitle>AI can make mistakes</TileTitle>
            </div>
            <TileDescription>
              Review important information carefully.
            </TileDescription>
          </TileHeader>
        </Tile>
      )}

      {/* Generated-at timestamp — shown when a summary is displayed and not actively streaming */}
      {generatedAt && !loading && (
        <p className="text-xs text-muted-foreground">
          Generated {formatDateTimeFromNow(generatedAt)}
        </p>
      )}

      {!summary && !loading && !error && (
        <p className="text-xs text-muted-foreground">
          Generate a concise summary of this task based on its description and
          comments.
        </p>
      )}
    </div>
  );
}
