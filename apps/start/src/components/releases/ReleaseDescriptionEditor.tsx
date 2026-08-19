import type { NodeJSON } from "prosekit/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "@/components/prosekit/editor";
import processUploads from "@/components/prosekit/upload";
import { Button } from "@repo/ui/components/button";
import { Spinner } from "@repo/ui/components/spinner";
import { IconSparkles } from "@tabler/icons-react";
import { extractTextContent, useToastAction } from "@/lib/util";
import type { schema } from "@repo/database";
import { isAiFeatureEnabled, resolveOrgAiStatus } from "@repo/util";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { updateReleaseAction } from "@/lib/fetches/release";
import { streamGenerateReleaseNotes } from "@/lib/fetches/ai";
import { useLayoutData } from "@/components/generic/Context";

const RELEASE_NOTES_FEATURE_ID = "release-notes";

interface ReleaseDescriptionEditorProps {
	release: schema.ReleaseWithTasks;
	organizationId: string;
	categories: schema.categoryType[];
	tasks: schema.TaskWithLabels[];
}

export function ReleaseDescriptionEditor({
	release,
	organizationId,
	categories,
	tasks,
}: ReleaseDescriptionEditorProps) {
	const [description, setDescription] = useState<NodeJSON | undefined>(release?.description || undefined);
	const [savedDescription, setSavedDescription] = useState<NodeJSON | undefined>(undefined);
	const [isSavingDescription, setIsSavingDescription] = useState(false);
	const { runWithToast } = useToastAction();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const { aiEnabled, organizations } = useLayoutData();

	// AI draft state — only ever set by an explicit "Insert" action below, never
	// by normal typing, so it can safely be used as the editor's defaultContent
	// seed without recreating the editor (and losing cursor/undo history) on
	// every keystroke.
	const [aiDraftContent, setAiDraftContent] = useState<NodeJSON | undefined>(undefined);
	const [aiDraftText, setAiDraftText] = useState<string>("");
	const [aiGenerating, setAiGenerating] = useState(false);
	const [aiError, setAiError] = useState<string | null>(null);
	const pendingNodeJsonRef = useRef<NodeJSON | null>(null);

	// Sync with release changes
	useEffect(() => {
		const desc = release?.description as NodeJSON | undefined;
		setDescription(desc);
		setSavedDescription(desc);
		setAiDraftContent(undefined);
	}, [release?.description]);

	const handleSave = useCallback(
		async (content: NodeJSON | undefined) => {
			if (!release || !content) return;

			try {
				setIsSavingDescription(true);
				const processedContent = await processUploads(
					content,
					"public",
					organizationId,
					"update-release-description"
				);

				const result = await runWithToast(
					"update-release-description",
					{
						loading: {
							title: "Saving...",
							description: "Updating release description.",
						},
						success: {
							title: "Saved",
							description: "Description updated successfully.",
						},
						error: {
							title: "Failed",
							description: "Could not save description.",
						},
					},
					() => updateReleaseAction(organizationId, release.id, { description: processedContent }, sseClientId)
				);

				if (result?.success) {
					setDescription(processedContent);
					setSavedDescription(processedContent);
				}
			} finally {
				setIsSavingDescription(false);
			}
		},
		[release, organizationId, sseClientId, runWithToast]
	);

	const hasUnsavedChanges = useMemo(() => {
		const currentText = extractTextContent(description);
		const savedText = extractTextContent(savedDescription);
		return currentText !== savedText;
	}, [description, savedDescription]);

	const org = organizations.find((o) => o.id === organizationId);
	const editionRaw = import.meta.env.VITE_SAYR_EDITION as string | undefined;
	const isOrgOnCloud = editionRaw === "cloud";
	const isOrgPro = org?.plan === "pro";
	const { aiDisabled, aiRateLimited } = resolveOrgAiStatus(org?.settings);
	const releaseNotesAvailable =
		aiEnabled &&
		!(isOrgOnCloud && !isOrgPro) &&
		!aiDisabled &&
		!aiRateLimited &&
		isAiFeatureEnabled(org?.settings, RELEASE_NOTES_FEATURE_ID);

	const handleGenerate = () => {
		setAiGenerating(true);
		setAiDraftText("");
		setAiError(null);
		pendingNodeJsonRef.current = null;

		streamGenerateReleaseNotes(
			release.id,
			organizationId,
			(chunk) => setAiDraftText((prev) => prev + chunk),
			(content) => {
				pendingNodeJsonRef.current = content as NodeJSON;
			},
			() => setAiGenerating(false),
			(err) => {
				setAiError(err);
				setAiGenerating(false);
			}
		);
	};

	const handleInsert = () => {
		if (!pendingNodeJsonRef.current) return;
		setAiDraftContent(pendingNodeJsonRef.current);
		setDescription(pendingNodeJsonRef.current);
		setAiDraftText("");
		pendingNodeJsonRef.current = null;
	};

	const handleDismissDraft = () => {
		setAiDraftText("");
		setAiError(null);
		pendingNodeJsonRef.current = null;
	};

	return (
		<div className="w-full min-w-full flex flex-col gap-2">
			{releaseNotesAvailable && (
				<div className="flex items-center justify-between">
					<Button
						variant="ghost"
						size="sm"
						className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
						onClick={handleGenerate}
						disabled={aiGenerating}
					>
						{aiGenerating ? <Spinner className="size-3 mr-1" /> : <IconSparkles size={12} className="mr-1" />}
						{aiGenerating ? "Generating..." : "Generate release notes with AI"}
					</Button>
				</div>
			)}

			{aiError && <p className="text-xs text-destructive">{aiError}</p>}

			{(aiDraftText || aiGenerating) && !aiError && (
				<div className="rounded-xl border border-dashed border-border bg-card p-3 flex flex-col gap-2">
					<div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
						{aiDraftText}
						{aiGenerating && (
							<span className="ml-0.5 inline-block w-0.5 h-3.5 bg-foreground/60 animate-pulse align-middle" />
						)}
					</div>
					{!aiGenerating && pendingNodeJsonRef.current && (
						<div className="flex items-center gap-2">
							<Button variant="primary" size="sm" className="text-xs h-auto py-1" onClick={handleInsert}>
								Insert into description
							</Button>
							<Button variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={handleGenerate}>
								Regenerate
							</Button>
							<Button variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={handleDismissDraft}>
								Dismiss
							</Button>
						</div>
					)}
				</div>
			)}

			<Editor
				defaultContent={aiDraftContent ?? (release?.description || undefined)}
				onChange={setDescription}
				placeholder="Add a description for this release..."
				categories={categories}
				tasks={tasks}
				hideBlockHandle={true}
			/>
			<div className="flex w-full">
				{hasUnsavedChanges && (
					<Button
						variant="primary"
						size="sm"
						className="text-xs py-1 h-auto ml-auto"
						onClick={() => handleSave(description)}
						disabled={isSavingDescription}
					>
						{isSavingDescription ? "Saving..." : "Update"}
					</Button>
				)}
			</div>
		</div>
	);
}
