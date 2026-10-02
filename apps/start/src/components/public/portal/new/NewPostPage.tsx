import type { schema } from "@repo/database";
import { buttonVariants } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { generateSlug } from "@repo/util";
import { IconArrowLeft, IconX } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { NodeJSON } from "prosekit/core";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import processUploads from "@/components/prosekit/upload";
import { KindPicker } from "@/components/public/portal/new/KindPicker";
import { LabelPicker } from "@/components/public/portal/new/LabelPicker";
import { NewPostFooter } from "@/components/public/portal/new/NewPostFooter";
import { PostDetailsEditor } from "@/components/public/portal/new/PostDetailsEditor";
import { PostingDisabledCard } from "@/components/public/portal/new/PostingDisabledCard";
import { PostLiveCard } from "@/components/public/portal/new/PostLiveCard";
import { PostTitleField } from "@/components/public/portal/new/PostTitleField";
import { PriorityPicker } from "@/components/public/portal/new/PriorityPicker";
import { TemplatePicker } from "@/components/public/portal/new/TemplatePicker";
import { usePublicPostAbility } from "@/components/public/public-task-creator";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { boardListKey } from "@/hooks/portal/useBoardList";
import { useSimilarPosts } from "@/hooks/portal/useSimilarPosts";
import type { MentionContext } from "@/hooks/useMentionUsers";
import { createPublicTaskAction } from "@/lib/fetches/task";
import {
	DEFAULT_POST_PRIORITY,
	docHasContent,
	isPostPriority,
	type NewPostDraft,
	newPostDraftKey,
	type PostPriority,
	parseDraft,
	resolveInitialDraft,
	serialiseDraft,
} from "@/lib/portal/new-post";

const NO_TEMPLATE = "__none__";
/** How long the draft settles before it is written to `sessionStorage`. */
const DRAFT_SAVE_DELAY_MS = 300;

/** `value` without a leading `prefix` (a template's title prefix), if it has one. */
function stripPrefix(value: string, prefix: string): string {
	return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function readStoredDraft(orgId: string): NewPostDraft | null {
	try {
		return parseDraft(window.sessionStorage.getItem(newPostDraftKey(orgId)));
	} catch {
		return null;
	}
}

function writeStoredDraft(orgId: string, draft: NewPostDraft) {
	try {
		const raw = serialiseDraft(draft);
		if (raw) window.sessionStorage.setItem(newPostDraftKey(orgId), raw);
		else window.sessionStorage.removeItem(newPostDraftKey(orgId));
	} catch {
		// Storage can be unavailable (private mode, quota); the draft just is not kept.
	}
}

interface NewPostPageProps {
	/** `?title=` from the search box or the board composer. */
	initialTitle?: string;
	/** `?category=`: a category id or its slug. */
	initialCategory?: string;
}

/**
 * The full "share an idea or report a bug" form (`/orgs/$orgSlug/new`): an optional (or, when the org disallows blank
 * posts, required) template, kind chips (the org's categories), a title with live similar posts, rich-text details,
 * priority and label pickers (each gated by the org's `publicTaskFields`) and a footer with the post button. A template
 * prefills title prefix, details, kind, priority and labels, all still editable. Logged-out visitors can fill it in; Post
 * opens the login dialog and the draft is kept in `sessionStorage` (per org, cleared on success). On phones it becomes a
 * full-screen sheet with a close button and a sticky post button.
 */
export function NewPostPage({ initialTitle, initialCategory }: NewPostPageProps) {
	const queryClient = useQueryClient();
	const { organization, categories, labels, issueTemplates } = usePublicOrganizationLayout();
	const { settings, loggedIn, canPost, needsFullForm: templateRequired } = usePublicPostAbility();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const { setValue: setMentionContext } = useStateManagement<MentionContext | null>("mentionContext", null);
	const titleRef = useRef<HTMLInputElement>(null);

	const fields = settings.publicTaskFields;
	const showKinds = fields.category && categories.length > 0;
	const showPriority = fields.priority;
	const showLabels = fields.labels && labels.length > 0;
	const orgSlug = organization.slug;

	// SSR renders the prefilled title; the stored draft is restored after mount (no `sessionStorage` on the server).
	const [title, setTitle] = useState(initialTitle?.trim() ?? "");
	const [categoryId, setCategoryId] = useState<string | null>(null);
	const [description, setDescription] = useState<NodeJSON | undefined>(undefined);
	/** Content the editor opens with. Separate from `description` because changing it rebuilds the editor. */
	const [initialDoc, setInitialDoc] = useState<NodeJSON | undefined>(undefined);
	const [editorKey, setEditorKey] = useState(0);
	const [restored, setRestored] = useState(false);

	const [templateId, setTemplateId] = useState(NO_TEMPLATE);
	const [priority, setPriority] = useState<PostPriority>(DEFAULT_POST_PRIORITY);
	const [labelIds, setLabelIds] = useState<string[]>([]);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [created, setCreated] = useState<schema.TaskWithLabels | null>(null);

	const trimmedTitle = title.trim();
	const similar = useSimilarPosts(organization.id, title);
	const templateMissing = templateRequired && templateId === NO_TEMPLATE;

	// The editor's mention menu reads this to find the org's members.
	useEffect(() => {
		setMentionContext({ orgId: organization.id, orgShortId: organization.shortId });
	}, [organization.id, organization.shortId, setMentionContext]);

	// Restore the draft (and a `?category=`) once, after mount.
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs once per org on mount
	useEffect(() => {
		const draft = resolveInitialDraft(initialTitle, readStoredDraft(organization.id));
		let nextCategory = draft?.categoryId ?? null;
		if (!nextCategory && initialCategory) {
			nextCategory =
				categories.find(
					(category) => category.id === initialCategory || generateSlug(category.name) === initialCategory
				)?.id ?? null;
		}
		if (draft) {
			setTitle(draft.title);
			setDescription(draft.description);
			setInitialDoc(draft.description);
			setPriority(draft.priority);
			setLabelIds(draft.labelIds.filter((id) => labels.some((label) => label.id === id)));
			if (draft.templateId && issueTemplates.some((template) => template.id === draft.templateId)) {
				setTemplateId(draft.templateId);
			}
		}
		if (nextCategory && categories.some((category) => category.id === nextCategory)) setCategoryId(nextCategory);
		setRestored(true);
		if (window.matchMedia("(min-width: 768px)").matches) titleRef.current?.focus();
	}, [organization.id]);

	// Keep the draft while typing, so a login round trip (or reading a similar post) does not lose it.
	useEffect(() => {
		if (!restored || created) return;
		const timer = window.setTimeout(
			() =>
				writeStoredDraft(organization.id, {
					title,
					description,
					categoryId,
					priority,
					labelIds,
					templateId: templateId === NO_TEMPLATE ? null : templateId,
				}),
			DRAFT_SAVE_DELAY_MS
		);
		return () => window.clearTimeout(timer);
	}, [restored, created, organization.id, title, description, categoryId, priority, labelIds, templateId]);

	const clearDraft = useCallback(() => {
		try {
			window.sessionStorage.removeItem(newPostDraftKey(organization.id));
		} catch {
			// Nothing to clear.
		}
	}, [organization.id]);

	const resetForm = useCallback(() => {
		setTitle("");
		setCategoryId(null);
		setDescription(undefined);
		setInitialDoc(undefined);
		setTemplateId(NO_TEMPLATE);
		setPriority(DEFAULT_POST_PRIORITY);
		setLabelIds([]);
		setEditorKey((key) => key + 1);
	}, []);

	// Choosing a template prefills the form; every field stays editable afterwards. A template only overrides the fields it
	// sets, so a priority or labels the visitor already picked survive a template that has none. "Start from scratch"
	// clears the form, like the old creator did.
	const handleTemplateSelect = useCallback(
		(nextId: string) => {
			const previousPrefix = issueTemplates.find((entry) => entry.id === templateId)?.titlePrefix;
			setTemplateId(nextId);
			const template = issueTemplates.find((entry) => entry.id === nextId);
			if (!template) {
				if (previousPrefix) setTitle((current) => stripPrefix(current, previousPrefix));
				setPriority(DEFAULT_POST_PRIORITY);
				setLabelIds([]);
				setCategoryId(null);
				setInitialDoc(undefined);
				setDescription(undefined);
				setEditorKey((key) => key + 1);
				return;
			}
			const prefix = template.titlePrefix;
			setTitle((current) => {
				const bare = previousPrefix ? stripPrefix(current, previousPrefix) : current;
				return prefix && !bare.startsWith(prefix) ? `${prefix}${bare}` : bare;
			});
			setInitialDoc(template.description ?? undefined);
			setDescription(template.description ?? undefined);
			setEditorKey((key) => key + 1);
			if (
				template.categoryId &&
				fields.category &&
				categories.some((category) => category.id === template.categoryId)
			) {
				setCategoryId(template.categoryId);
			}
			if (fields.priority && isPostPriority(template.priority)) setPriority(template.priority);
			if (fields.labels && template.labels.length > 0) {
				setLabelIds(
					template.labels.map((label) => label.id).filter((id) => labels.some((label) => label.id === id))
				);
			}
		},
		[issueTemplates, templateId, categories, labels, fields.category, fields.priority, fields.labels]
	);

	const handleSubmit = useCallback(async () => {
		if (isSubmitting || !loggedIn) return;
		if (!trimmedTitle) {
			headlessToast.error({
				title: "Add a title",
				description: "Give your post a short title so others can find it.",
				id: "public-task-create",
			});
			titleRef.current?.focus();
			return;
		}
		if (templateMissing) {
			headlessToast.error({
				title: "Choose a template",
				description: "This board asks you to start from a template.",
				id: "public-task-create",
			});
			return;
		}

		setIsSubmitting(true);
		try {
			const finalDescription =
				description && docHasContent(description)
					? await processUploads(description, "public", organization.id, "public-task-create")
					: undefined;

			const result = await createPublicTaskAction(
				organization.id,
				{
					title: trimmedTitle,
					description: finalDescription,
					priority: fields.priority ? priority : undefined,
					labels: fields.labels ? labelIds : [],
					category: fields.category ? categoryId : null,
					templateId: templateId !== NO_TEMPLATE ? templateId : undefined,
				},
				sseClientId
			);

			if (result.success) {
				clearDraft();
				setCreated(result.data);
				void queryClient.invalidateQueries({ queryKey: boardListKey(organization.id) });
				headlessToast.success({
					title: "Posted to the board",
					description: "Your post is live.",
					id: "public-task-create",
				});
			} else {
				headlessToast.error({
					title: "Could not post",
					description: result.error || "Something went wrong.",
					id: "public-task-create",
				});
			}
		} catch {
			headlessToast.error({
				title: "Could not post",
				description: "Check your connection and try again.",
				id: "public-task-create",
			});
		} finally {
			setIsSubmitting(false);
		}
	}, [
		isSubmitting,
		loggedIn,
		trimmedTitle,
		templateMissing,
		description,
		organization.id,
		fields.priority,
		fields.labels,
		fields.category,
		priority,
		labelIds,
		categoryId,
		templateId,
		sseClientId,
		clearDraft,
		queryClient,
	]);

	const handlePostAnother = useCallback(() => {
		resetForm();
		setCreated(null);
	}, [resetForm]);

	const templateItems = [
		{ value: NO_TEMPLATE, label: templateRequired ? "Choose a template" : "Start from scratch" },
		...issueTemplates.map((template) => ({ value: template.id, label: template.name })),
	];

	let body: ReactNode;
	if (!canPost) {
		body = <PostingDisabledCard orgSlug={orgSlug} />;
	} else if (created) {
		body = (
			<PostLiveCard
				post={created}
				fallbackTitle={trimmedTitle}
				orgSlug={orgSlug}
				orgShortId={organization.shortId}
				onPostAnother={handlePostAnother}
			/>
		);
	} else {
		body = (
			<>
				<h1 className="font-bold text-[32px] text-foreground leading-[38px] tracking-[-0.028em] max-md:text-[26px] max-md:leading-8 max-md:tracking-[-0.026em]">
					<span className="md:hidden">What is on your mind?</span>
					<span className="max-md:hidden">Share an idea or report a bug</span>
				</h1>
				<p className="mt-2 text-[15px] text-muted-foreground leading-6 max-md:mt-1.5 max-md:mb-5 max-md:leading-[22px]">
					<span className="md:hidden">We check as you type whether someone has already posted it.</span>
					<span className="max-md:hidden">
						Start with a title. We will show you anything similar that is already on the board, so you can vote on
						it rather than start a new thread.
					</span>
				</p>

				<Card className="mt-8 max-md:mt-0 max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:shadow-none">
					<div className="flex flex-col gap-6 px-7 pt-6 pb-7 max-md:gap-5 max-md:p-0 max-md:pb-6">
						{issueTemplates.length > 0 && (
							<TemplatePicker
								value={templateId}
								items={templateItems}
								required={templateRequired}
								missing={templateMissing}
								onSelect={handleTemplateSelect}
							/>
						)}
						{showKinds && <KindPicker categories={categories} value={categoryId} onChange={setCategoryId} />}
						<PostTitleField value={title} onChange={setTitle} inputRef={titleRef} similar={similar} />
						<PostDetailsEditor
							ready={restored}
							editorKey={editorKey}
							initialDoc={initialDoc}
							hasTemplate={templateId !== NO_TEMPLATE && !!initialDoc}
							categories={categories}
							onChange={setDescription}
							onSubmit={() => void handleSubmit()}
						/>
						{showPriority && <PriorityPicker value={priority} onChange={setPriority} />}
						{showLabels && <LabelPicker labels={labels} value={labelIds} onChange={setLabelIds} />}
					</div>

					<NewPostFooter
						orgSlug={orgSlug}
						loggedIn={loggedIn}
						isSubmitting={isSubmitting}
						disabled={!trimmedTitle || templateMissing}
						onSubmit={() => void handleSubmit()}
						onCancel={clearDraft}
					/>
				</Card>
			</>
		);
	}

	return (
		<div className="h-full overflow-y-auto max-md:fixed max-md:inset-0 max-md:z-50 max-md:h-dvh max-md:bg-background">
			<header className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b bg-background px-2 md:hidden">
				<Link
					to="/orgs/$orgSlug"
					params={{ orgSlug }}
					onClick={clearDraft}
					aria-label="Close"
					className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11")}
				>
					<IconX aria-hidden className="size-5" />
				</Link>
				<span className="flex-1 font-semibold text-base text-foreground">New post</span>
			</header>

			<main className="mx-auto w-full max-w-[1200px] px-6 pt-7 pb-20 max-md:px-0 max-md:pt-6 max-md:pb-0">
				<Link
					to="/orgs/$orgSlug"
					params={{ orgSlug }}
					className="inline-flex items-center gap-2 font-medium text-[13.5px] text-muted-foreground hover:text-foreground max-md:hidden"
				>
					<IconArrowLeft aria-hidden className="size-4" />
					Feedback
				</Link>
				<div className="mx-auto mt-6 w-full max-w-[720px] max-md:mt-0 max-md:px-4">{body}</div>
			</main>
		</div>
	);
}
