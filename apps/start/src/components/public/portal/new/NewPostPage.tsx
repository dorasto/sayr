import { authClient } from "@repo/auth/client";
import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button, buttonVariants } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, formatTaskKey, generateSlug, getInitials } from "@repo/util";
import {
	IconArrowLeft,
	IconCheck,
	IconChevronDown,
	IconChevronUp,
	IconLink,
	IconLoader2,
	IconLock,
	IconMessageCircle,
	IconX,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { NodeJSON } from "prosekit/core";
import { lazy, type ReactNode, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import LoginDialog from "@/components/auth/login";
import RenderIcon from "@/components/generic/RenderIcon";
import processUploads from "@/components/prosekit/upload";
import { useBoardVote } from "@/components/public/portal/board/useBoardVote";
import { PostEditorToolbar } from "@/components/public/portal/new/PostEditorToolbar";
import { StatusChip } from "@/components/public/portal/ui/StatusChip";
import { VoteBox } from "@/components/public/portal/ui/VoteBox";
import { usePublicPostAbility } from "@/components/public/public-task-creator";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { boardListKey } from "@/hooks/portal/useBoardList";
import { usePostPublicUrl } from "@/hooks/portal/usePostPublicUrl";
import { useSimilarPosts } from "@/hooks/portal/useSimilarPosts";
import type { MentionContext } from "@/hooks/useMentionUsers";
import { createPublicTaskAction } from "@/lib/fetches/task";
import {
	DEFAULT_POST_PRIORITY,
	docHasContent,
	isDocJson,
	isPostPriority,
	type NewPostDraft,
	newPostDraftKey,
	POST_PRIORITIES,
	type PostPriority,
	parseDraft,
	resolveInitialDraft,
	serialiseDraft,
	splitCategoryChips,
} from "@/lib/portal/new-post";

const Editor = lazy(() => import("@/components/prosekit/editor"));

const NO_TEMPLATE = "__none__";
/** How long the draft settles before it is written to `sessionStorage`. */
const DRAFT_SAVE_DELAY_MS = 300;

function CategoryIcon({ category }: { category: schema.categoryType }) {
	return (
		<span aria-hidden className="flex" style={{ color: category.color || undefined }}>
			<RenderIcon iconName={category.icon || "IconCategory"} size={16} raw color={category.color || undefined} />
		</span>
	);
}

/** One similar-post row: vote box, title, status and comment count, plus an "Upvote this instead" action. */
function SimilarPostRow({ task }: { task: schema.TaskWithLabels }) {
	const { organization } = usePublicOrganizationLayout();
	const vote = useBoardVote(task);
	const commentCount = task.comments?.length ?? 0;

	return (
		<li className="flex items-center gap-3.5 border-t py-3 pr-3.5 pl-3 max-md:block max-md:p-3.5">
			<VoteBox
				size="sm"
				count={vote.voteCount}
				voted={vote.voted}
				disabled={vote.disabled}
				onToggle={vote.toggle}
				className="max-md:hidden"
			/>
			<div className="min-w-0 flex-1">
				<Link
					to="/orgs/$orgSlug/$shortId"
					params={{ orgSlug: organization.slug, shortId: String(task.shortId) }}
					className="block font-semibold text-[14.5px] text-foreground leading-[21px] hover:underline max-md:text-[15px]"
				>
					{task.title}
				</Link>
				<div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted-foreground max-md:mb-3">
					<StatusChip status={task.status} />
					<span className="md:hidden">
						{vote.voteCount} {vote.voteCount === 1 ? "vote" : "votes"}
					</span>
					<span className="inline-flex items-center gap-1 max-md:hidden">
						<IconMessageCircle aria-hidden className="size-3.5" />
						{commentCount} {commentCount === 1 ? "comment" : "comments"}
					</span>
				</div>
			</div>
			{!vote.disabled && (
				<Button
					variant="outline"
					aria-pressed={vote.voted}
					onClick={() => void vote.toggle()}
					className={cn(
						"h-8 px-2.5 text-[13px] max-md:h-11 max-md:w-full max-md:text-sm",
						vote.voted
							? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/20"
							: "max-md:border-primary/50 max-md:bg-primary/15 max-md:text-primary"
					)}
				>
					<IconChevronUp aria-hidden className="md:hidden" stroke={2} />
					{vote.voted ? "You upvoted this" : "Upvote this instead"}
				</Button>
			)}
		</li>
	);
}

interface NewPostPageProps {
	/** `?title=` from the search box or the board composer. */
	initialTitle?: string;
	/** `?category=`: a category id or its slug. */
	initialCategory?: string;
}

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
	const { data: session } = authClient.useSession();
	const { settings, loggedIn, canPost, needsFullForm: templateRequired } = usePublicPostAbility();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const { setValue: setMentionContext } = useStateManagement<MentionContext | null>("mentionContext", null);
	const titleId = useId();
	const templateSelectId = useId();
	const templateHintId = useId();
	const priorityId = useId();
	const titleRef = useRef<HTMLInputElement>(null);
	const liveHeadingRef = useRef<HTMLHeadingElement>(null);
	const postPublicUrl = usePostPublicUrl();

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
	const kindChips = useMemo(() => splitCategoryChips(categories), [categories]);
	const moreCategory = kindChips.more.find((category) => category.id === categoryId);

	// "Your post is live" replaces the form; move focus to its heading.
	useEffect(() => {
		if (created) liveHeadingRef.current?.focus();
	}, [created]);

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

	const copyLink = async () => {
		try {
			await navigator.clipboard.writeText(postPublicUrl(orgSlug, created?.shortId ?? null));
			headlessToast.success({ title: "Link copied", id: "public-post-link" });
		} catch {
			headlessToast.error({
				title: "Could not copy the link",
				description: "Copy it from the address bar after opening the post.",
				id: "public-post-link",
			});
		}
	};

	const userName = session?.user?.name?.trim() || "you";

	const postButton = loggedIn ? (
		<Button
			size="sm"
			className="max-md:h-12 max-md:w-full"
			onClick={() => void handleSubmit()}
			disabled={isSubmitting || !trimmedTitle || templateMissing}
		>
			{isSubmitting ? (
				<>
					<IconLoader2 aria-hidden className="animate-spin" />
					Posting
				</>
			) : (
				"Post to the board"
			)}
		</Button>
	) : (
		<LoginDialog
			trigger={
				<Button size="sm" className="max-md:h-12 max-md:w-full">
					Post to the board
				</Button>
			}
		/>
	);

	const templateItems = [
		{ value: NO_TEMPLATE, label: templateRequired ? "Choose a template" : "Start from scratch" },
		...issueTemplates.map((template) => ({ value: template.id, label: template.name })),
	];

	let body: ReactNode;
	if (!canPost) {
		body = (
			<Card className="mt-10 py-12">
				<div className="mx-auto flex max-w-[340px] flex-col items-center text-center">
					<span
						aria-hidden
						className="mb-3.5 inline-flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"
					>
						<IconLock className="size-6" />
					</span>
					<div className="font-semibold text-base text-foreground">Posting is turned off</div>
					<p className="mt-1.5 text-muted-foreground text-sm leading-[21px]">
						This board is not taking new posts right now. You can still read and upvote what is already there.
					</p>
					<Link
						to="/orgs/$orgSlug"
						params={{ orgSlug }}
						className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 max-md:h-11")}
					>
						Back to the board
					</Link>
				</div>
			</Card>
		);
	} else if (created) {
		const shortId = created.shortId;
		body = (
			<Card className="mt-10 p-6 max-md:mt-6 max-md:p-5">
				<div className="flex items-start gap-3.5">
					<span
						aria-hidden
						className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
					>
						<IconCheck className="size-[18px]" stroke={2.4} />
					</span>
					<div className="min-w-0 flex-1">
						<h2
							ref={liveHeadingRef}
							tabIndex={-1}
							className="font-semibold text-[17px] text-foreground tracking-[-0.01em] outline-none"
						>
							Your post is live
						</h2>
						<p className="mt-0.5 break-words text-muted-foreground text-sm">
							{created.title ?? trimmedTitle} · {formatTaskKey(organization.shortId, created.shortId)}
						</p>
					</div>
				</div>
				<div className="mt-[18px] flex flex-wrap gap-2 max-md:flex-col">
					{shortId === null ? (
						<Link
							to="/orgs/$orgSlug"
							params={{ orgSlug }}
							className={cn(buttonVariants({ size: "sm" }), "max-md:h-11")}
						>
							View the board
						</Link>
					) : (
						<Link
							to="/orgs/$orgSlug/$shortId"
							params={{ orgSlug, shortId: String(shortId) }}
							className={cn(buttonVariants({ size: "sm" }), "max-md:h-11")}
						>
							View post
						</Link>
					)}
					<Button variant="outline" size="sm" className="max-md:h-11" onClick={() => void copyLink()}>
						<IconLink aria-hidden />
						Copy link
					</Button>
					<Button variant="ghost" size="sm" className="max-md:h-11" onClick={handlePostAnother}>
						Post another
					</Button>
				</div>
			</Card>
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
							<div>
								<Label variant="subheading" htmlFor={templateSelectId} className="mb-2 flex items-center gap-2">
									Template{" "}
									<span className="font-normal text-muted-foreground">
										{templateRequired ? "Required" : "Optional"}
									</span>
								</Label>
								<Select
									value={templateId}
									items={templateItems}
									required={templateRequired}
									onValueChange={(next) => next && handleTemplateSelect(next)}
								>
									<SelectTrigger
										id={templateSelectId}
										aria-describedby={templateHintId}
										className={cn("h-10 w-full max-md:h-11", templateMissing && "border-primary/50")}
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{templateItems.map((item) => (
											<SelectItem key={item.value} value={item.value}>
												{item.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p id={templateHintId} className="mt-2 text-[13px] text-muted-foreground leading-[19px]">
									{templateMissing
										? "This board asks you to start from a template. Pick one to continue."
										: "A template fills in the title, details, kind, priority and labels. You can change any of them."}
								</p>
							</div>
						)}

						{showKinds && (
							<div>
								<div className="mb-2 flex items-center gap-2 font-semibold text-sm">
									What kind of post is this?
								</div>
								<fieldset aria-label="Kind of post" className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
									{kindChips.chips.map((category) => {
										const selected = categoryId === category.id;
										return (
											<Button
												key={category.id}
												variant="outline"
												size="sm"
												aria-pressed={selected}
												onClick={() => setCategoryId(selected ? null : category.id)}
												className={cn(
													"shrink-0 rounded-full pr-3.5 pl-3 max-md:h-11",
													selected
														? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/20"
														: "text-muted-foreground hover:text-foreground"
												)}
											>
												<CategoryIcon category={category} />
												{category.name}
											</Button>
										);
									})}
									{kindChips.more.length > 0 && (
										<DropdownMenu>
											<DropdownMenuTrigger
												className={cn(
													buttonVariants({ variant: "outline", size: "sm" }),
													"shrink-0 rounded-full pr-3 pl-3 max-md:h-11",
													moreCategory
														? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/20"
														: "border-dashed text-muted-foreground hover:text-foreground"
												)}
											>
												{moreCategory ? (
													<>
														<CategoryIcon category={moreCategory} />
														{moreCategory.name}
													</>
												) : (
													"Other category"
												)}
												<IconChevronDown aria-hidden className="size-3.5" />
											</DropdownMenuTrigger>
											<DropdownMenuContent align="start" className="max-h-[min(60dvh,360px)] w-56">
												<DropdownMenuRadioGroup
													value={moreCategory?.id ?? ""}
													onValueChange={(next) => setCategoryId(next || null)}
												>
													{kindChips.more.map((category) => (
														<DropdownMenuRadioItem key={category.id} value={category.id}>
															<span className="flex items-center gap-2">
																<CategoryIcon category={category} />
																{category.name}
															</span>
														</DropdownMenuRadioItem>
													))}
												</DropdownMenuRadioGroup>
											</DropdownMenuContent>
										</DropdownMenu>
									)}
								</fieldset>
							</div>
						)}

						<div>
							<Label variant="subheading" htmlFor={titleId} className="mb-2 flex items-center gap-2">
								Title
							</Label>
							<Input
								ref={titleRef}
								id={titleId}
								value={title}
								onChange={(event) => setTitle(event.target.value)}
								placeholder="Short, descriptive title"
								autoComplete="off"
								className="h-[52px] px-4 font-medium text-[17px] max-md:px-3.5 max-md:text-base"
							/>
							{similar.length > 0 && (
								<section
									aria-live="polite"
									className="mt-4 overflow-hidden rounded-xl border border-primary/50 bg-background"
								>
									<h3 className="m-0 flex flex-wrap items-center gap-x-2.5 bg-primary/15 px-4 py-3 font-semibold text-primary text-sm">
										{similar.length === 1 ? "1 post looks similar." : `${similar.length} posts look similar.`}
										<span className="font-normal text-muted-foreground max-md:hidden">
											Upvote one instead of posting a duplicate.
										</span>
									</h3>
									<ul>
										{similar.map((task) => (
											<SimilarPostRow key={task.id} task={task} />
										))}
									</ul>
								</section>
							)}
						</div>

						<div>
							<div className="mb-2 flex items-center gap-2 font-semibold text-sm">
								Details <span className="font-normal text-muted-foreground">Optional, but it helps</span>
							</div>
							<div className="overflow-hidden rounded-lg border border-input bg-background focus-within:border-primary/60">
								{restored ? (
									<Suspense fallback={<Skeleton className="h-48 rounded-none" />}>
										<Editor
											key={editorKey}
											firstLinePlaceholder="What are you trying to do, and what gets in the way? For a bug, what you did and what you expected."
											className="bg-transparent text-[15px] leading-6 [&_.ProseMirror]:min-h-40 [&_.ProseMirror]:px-4 [&_.ProseMirror]:py-3.5!"
											onChange={setDescription}
											submit={() => void handleSubmit()}
											categories={categories}
											defaultContent={initialDoc && isDocJson(initialDoc) ? initialDoc : undefined}
											hasTemplate={templateId !== NO_TEMPLATE && !!initialDoc}
											hideBlockHandle
											toolbar={<PostEditorToolbar />}
										/>
									</Suspense>
								) : (
									<Skeleton className="h-48 rounded-none" />
								)}
							</div>
						</div>

						{showPriority && (
							<div className="md:max-w-60">
								<Label variant="subheading" htmlFor={priorityId} className="mb-2 flex items-center gap-2">
									Priority
								</Label>
								<Select
									value={priority}
									items={POST_PRIORITIES}
									onValueChange={(next) => isPostPriority(next) && setPriority(next)}
								>
									<SelectTrigger id={priorityId} className="h-10 w-full max-md:h-11">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{POST_PRIORITIES.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						{showLabels && (
							<div>
								<div className="mb-2 flex items-center gap-2 font-semibold text-sm">Labels</div>
								<fieldset aria-label="Labels" className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
									{labels.map((label) => {
										const selected = labelIds.includes(label.id);
										return (
											<Button
												key={label.id}
												variant="outline"
												size="sm"
												aria-pressed={selected}
												onClick={() =>
													setLabelIds(
														selected ? labelIds.filter((id) => id !== label.id) : [...labelIds, label.id]
													)
												}
												className={cn(
													"h-[34px] shrink-0 rounded-full px-3 text-[13.5px] max-md:h-11",
													selected
														? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/20"
														: "text-muted-foreground hover:text-foreground"
												)}
											>
												<i
													aria-hidden
													className="block size-2 shrink-0 rounded-[3px] bg-muted-foreground"
													style={label.color ? { background: label.color } : undefined}
												/>
												{label.name}
											</Button>
										);
									})}
								</fieldset>
							</div>
						)}
					</div>

					<div className="flex items-center gap-3 rounded-b-lg border-t bg-sidebar px-7 py-4 max-md:sticky max-md:bottom-0 max-md:z-10 max-md:-mx-4 max-md:flex-col max-md:items-stretch max-md:gap-2.5 max-md:rounded-none max-md:bg-background max-md:px-4 max-md:pt-3 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
						<div className="flex min-w-0 flex-1 items-center gap-3 text-[13.5px] text-muted-foreground max-md:flex-none max-md:text-xs">
							{loggedIn ? (
								<>
									<Avatar className="size-6 max-md:hidden">
										{session?.user?.image ? (
											<AvatarImage src={ensureCdnUrl(session.user.image)} alt={session.user.name ?? ""} />
										) : null}
										<AvatarFallback className="font-semibold text-xs">
											{getInitials(session?.user?.name)}
										</AvatarFallback>
									</Avatar>
									<span className="min-w-0 truncate">
										Posting as <b className="font-semibold text-foreground">{userName}</b>
										<span aria-hidden> · </span>
										your post will be public
									</span>
								</>
							) : (
								<span>You will log in before your post goes up. Your post will be public.</span>
							)}
						</div>
						<Link
							to="/orgs/$orgSlug"
							params={{ orgSlug }}
							onClick={clearDraft}
							className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "max-md:hidden")}
						>
							Cancel
						</Link>
						{postButton}
					</div>
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
