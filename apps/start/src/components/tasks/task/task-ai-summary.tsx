import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Spinner } from "@repo/ui/components/spinner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/ui/components/collapsible";
import { IconSparkles, IconRefresh, IconChevronRight } from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";
import parse from "html-react-parser";
import { streamSummarizeTask, type AiPromptDebugInfo } from "@/lib/fetches/ai";
import { renderMarkdown } from "@/lib/markdown";

interface AiTaskSummaryProps {
	task: schema.TaskWithLabels;
	orgId: string;
}

export function AiTaskSummary({ task, orgId }: AiTaskSummaryProps) {
	const [summary, setSummary] = useState<string | null>(null);
	const [renderedHtml, setRenderedHtml] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [promptDebug, setPromptDebug] = useState<AiPromptDebugInfo | null>(null);
	// Track the latest summary string so the async render doesn't overwrite a
	// newer result with a stale one when chunks arrive quickly.
	const latestSummaryRef = useRef<string | null>(null);

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

	// Only render on Sayr Cloud
	if (import.meta.env.VITE_SAYR_EDITION !== "cloud") {
		return null;
	}

	const handleGenerate = () => {
		setSummary(null);
		setRenderedHtml(null);
		setError(null);
		setLoading(true);
		setPromptDebug(null);
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
			() => {
				setLoading(false);
			},
			(err) => {
				setError(err);
				setLoading(false);
			},
		);
	};

	return (
		<div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 flex flex-col gap-2">
			{/* Header row */}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
					<IconSparkles size={14} />
					<span>AI Summary</span>
				</div>
				<Button
					variant="ghost"
					size="sm"
					className="h-6 px-2 text-xs"
					onClick={handleGenerate}
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
			</div>

			{/* Prompt preview — collapsed by default */}
			<Collapsible>
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
					{promptDebug ? (
						<div className="flex flex-col gap-2 mt-1.5">
							<div>
								<p className="text-xs font-medium text-muted-foreground mb-1">System prompt</p>
								<pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted rounded-md px-3 py-2 leading-relaxed">
									{promptDebug.systemPrompt}
								</pre>
							</div>
							<div>
								<p className="text-xs font-medium text-muted-foreground mb-1">User prompt</p>
								<pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted rounded-md px-3 py-2 leading-relaxed">
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

			{error && <p className="text-xs text-destructive">{error}</p>}

			{(renderedHtml || (loading && summary)) && (
				<div className="text-sm text-foreground leading-relaxed [&_strong]:font-semibold [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_p]:leading-relaxed [&_p+p]:mt-2">
					{renderedHtml ? parse(renderedHtml) : summary}
					{loading && <span className="ml-0.5 inline-block w-0.5 h-3.5 bg-foreground/60 animate-pulse align-middle" />}
				</div>
			)}

			{!summary && !loading && !error && (
				<p className="text-xs text-muted-foreground">
					Generate a concise summary of this task based on its description and comments.
				</p>
			)}
		</div>
	);
}
