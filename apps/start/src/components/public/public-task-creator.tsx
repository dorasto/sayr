import { authClient } from "@repo/auth/client";
import type { OrganizationSettings, PublicTaskFieldSettings, schema } from "@repo/database";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconLoader2 } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { NodeJSON } from "prosekit/core";
import { type FormEvent, useCallback, useId, useMemo, useState } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useIsOrgMember } from "@/hooks/useIsOrgMember";
import { createPublicTaskAction } from "@/lib/fetches/task";
import { findDuplicates } from "@/lib/portal/duplicates";
import LoginDialog from "../auth/login";
import RenderIcon from "../generic/RenderIcon";
import { useComposerDraft } from "./portal/board/board-rail-context";
import { useBoardVote } from "./portal/board/useBoardVote";
import { newPostLink } from "./portal/board/new-post-path";
import { PortalButton, portalButtonVariants } from "./portal/ui/PortalButton";
import { PortalCard } from "./portal/ui/PortalCard";
import { StatusChip } from "./portal/ui/StatusChip";
import { VoteBox } from "./portal/ui/VoteBox";

/** Client-safe defaults (avoids importing from @repo/database which pulls in node:crypto). */
const defaultPublicTaskFieldSettings: PublicTaskFieldSettings = {
	labels: true,
	category: true,
	priority: true,
};

const defaultOrganizationSettings: OrganizationSettings = {
	allowActionsOnClosedTasks: true,
	publicActions: true,
	enablePublicPage: true,
	publicTaskAllowBlank: true,
	publicTaskFields: defaultPublicTaskFieldSettings,
};

/** What the viewer may do about posting, per the org's public settings (`publicActions`, templates, field gating). */
export function usePublicPostAbility() {
	const { data: session } = authClient.useSession();
	const { organization, issueTemplates } = usePublicOrganizationLayout();
	const isOrgMember = useIsOrgMember(organization);

	const settings = useMemo<OrganizationSettings>(() => {
		const raw = organization.settings as Partial<OrganizationSettings> | null;
		return {
			...defaultOrganizationSettings,
			...raw,
			publicTaskFields: {
				...defaultPublicTaskFieldSettings,
				...(raw?.publicTaskFields ?? {}),
			},
		};
	}, [organization.settings]);

	return {
		settings,
		loggedIn: !!session?.user,
		// Org members can always post; everyone else only when the org allows public actions. Logged-out visitors still
		// see the composer (so they can log in to use it) whenever it would be allowed for them.
		canPost: isOrgMember || settings.publicActions,
		// A required template can not be filled in from the rail; those posts continue on the full form.
		needsFullForm: issueTemplates.length > 0 && !settings.publicTaskAllowBlank,
	};
}

/** Plain text (one paragraph per line) as a ProseKit document, so the rail's textarea can feed `public-create`. */
function textToDoc(text: string): NodeJSON | undefined {
	const lines = text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	if (lines.length === 0) return undefined;
	return {
		type: "doc",
		content: lines.map((line) => ({ type: "paragraph", content: [{ type: "text", text: line }] })),
	};
}

const INPUT_CLASS =
	"w-full rounded-portal-md border border-portal-line-2 bg-portal-canvas px-3 text-portal-fg outline-none transition-[border-color,box-shadow] placeholder:text-portal-fg-3 focus:border-portal-focus focus:ring-[3px] focus:ring-portal-accent-soft";

function SimilarPost({ task }: { task: schema.TaskWithLabels }) {
	const { organization } = usePublicOrganizationLayout();
	const vote = useBoardVote(task);

	return (
		<li className="flex gap-3 rounded-portal-md border border-portal-line bg-portal-surface p-2.5">
			<VoteBox size="sm" count={vote.voteCount} voted={vote.voted} disabled={vote.disabled} onToggle={vote.toggle} />
			<div className="min-w-0 flex-1">
				<Link
					to="/orgs/$orgSlug/$shortId"
					params={{ orgSlug: organization.slug, shortId: String(task.shortId) }}
					className="mb-1.5 block font-medium text-[13.5px] leading-[19px] hover:underline focus-visible:underline"
				>
					{task.title}
				</Link>
				<div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
					<StatusChip status={task.status} />
					{!vote.disabled && (
						<button
							type="button"
							onClick={vote.toggle}
							className="cursor-pointer font-medium text-[13px] text-portal-accent-ink hover:underline focus-visible:underline"
						>
							{vote.voted ? "You upvoted this" : "Upvote this instead"}
						</button>
					)}
				</div>
			</div>
		</li>
	);
}

interface PublicTaskCreatorProps {
	/** The loaded board posts, searched for look-alikes while the title is typed. */
	tasks: ReadonlyArray<schema.TaskWithLabels>;
	className?: string;
}

/**
 * The board's "Share an idea or report a bug" card. Typing a title surfaces similar posts to upvote instead; focusing it
 * reveals a short description, category chips and the submit button. Submits straight to `public-create` (same rules as
 * before: `publicActions`, `publicTaskFields`), or hands off to the full form when the org requires a template.
 */
export function PublicTaskCreator({ tasks, className }: PublicTaskCreatorProps) {
	const navigate = useNavigate();
	const { organization, categories } = usePublicOrganizationLayout();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const { settings, loggedIn, canPost, needsFullForm } = usePublicPostAbility();
	const titleId = useId();

	// The draft lives in the board's provider, not here: this card renders inside the board panel, whose content
	// unmounts when the panel swaps to a post or closes.
	const { draft, updateDraft, resetDraft } = useComposerDraft();
	const { expanded, title, description, categoryId } = draft;
	const [isSubmitting, setIsSubmitting] = useState(false);

	const fields = settings.publicTaskFields;
	const showCategories = fields.category && categories.length > 0;
	const trimmedTitle = title.trim();
	const similar = useMemo(() => findDuplicates(trimmedTitle, tasks), [trimmedTitle, tasks]);
	const fullFormLink = newPostLink(organization.slug, trimmedTitle);

	const handleSubmit = useCallback(
		async (event?: FormEvent) => {
			event?.preventDefault();
			if (isSubmitting || !trimmedTitle) return;
			if (!loggedIn) return;
			if (needsFullForm) {
				navigate(newPostLink(organization.slug, trimmedTitle));
				return;
			}

			setIsSubmitting(true);
			try {
				const result = await createPublicTaskAction(
					organization.id,
					{
						title: trimmedTitle,
						description: textToDoc(description),
						priority: fields.priority ? "none" : undefined,
						labels: [],
						category: fields.category ? categoryId : null,
					},
					sseClientId
				);

				if (result.success) {
					headlessToast.success({
						title: "Posted to the board",
						description: "Your post is live.",
						id: "public-task-create",
					});
					resetDraft();
					navigate({
						to: "/orgs/$orgSlug/$shortId",
						params: { orgSlug: organization.slug, shortId: String(result.data.shortId) },
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
		},
		[
			isSubmitting,
			trimmedTitle,
			loggedIn,
			needsFullForm,
			navigate,
			organization.id,
			organization.slug,
			description,
			fields.priority,
			fields.category,
			categoryId,
			sseClientId,
			resetDraft,
		]
	);

	if (!canPost) return null;

	const submitClass = "w-full";

	return (
		<PortalCard className={className}>
			<form onSubmit={handleSubmit}>
				<h2 className="mb-1 font-semibold text-[15px] text-portal-fg">Share an idea or report a bug</h2>
				<p className="mb-3.5 text-[13px] text-portal-fg-2 leading-[19px]">
					Search first. If someone already posted it, give it your vote instead.
				</p>

				<label htmlFor={titleId} className="sr-only">
					Title
				</label>
				<input
					id={titleId}
					value={title}
					onChange={(event) => updateDraft({ title: event.target.value })}
					onFocus={() => updateDraft({ expanded: true })}
					placeholder="Short, descriptive title"
					autoComplete="off"
					className={cn(INPUT_CLASS, "h-10")}
				/>

				{similar.length > 0 && (
					<div className="mt-3">
						<div className="mb-2 font-semibold text-portal-fg-3 text-xs">Similar posts</div>
						<ul className="flex flex-col gap-2">
							{similar.map(({ task }) => (
								<SimilarPost key={task.id} task={task} />
							))}
						</ul>
					</div>
				)}

				{(expanded || trimmedTitle) && (
					<div className="mt-3 flex flex-col gap-3">
						<textarea
							value={description}
							onChange={(event) => updateDraft({ description: event.target.value })}
							placeholder="Add more detail (optional)"
							rows={4}
							aria-label="Description"
							className={cn(INPUT_CLASS, "resize-none py-2.5 leading-[22px]")}
						/>

						{showCategories && (
							<fieldset aria-label="Category" className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0">
								{categories.map((category) => {
									const selected = categoryId === category.id;
									return (
										<button
											key={category.id}
											type="button"
											aria-pressed={selected}
											onClick={() => updateDraft({ categoryId: selected ? null : category.id })}
											className={cn(
												"inline-flex h-[30px] cursor-pointer items-center gap-[7px] rounded-full border px-2.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-portal-focus",
												selected
													? "border-portal-accent-line bg-portal-accent-soft text-portal-accent-ink"
													: "border-portal-line-2 text-portal-fg-2 hover:bg-portal-hover focus-visible:bg-portal-hover hover:text-portal-fg focus-visible:text-portal-fg"
											)}
										>
											<RenderIcon
												iconName={category.icon || "IconCategory"}
												size={14}
												raw
												color={category.color || undefined}
											/>
											{category.name}
										</button>
									);
								})}
							</fieldset>
						)}

						{loggedIn ? (
							needsFullForm ? (
								<Link
									{...fullFormLink}
									className={cn(portalButtonVariants({ variant: "primary", size: "md" }), submitClass)}
								>
									Continue
								</Link>
							) : (
								<PortalButton
									type="submit"
									variant="primary"
									className={submitClass}
									disabled={isSubmitting || !trimmedTitle}
								>
									{isSubmitting ? (
										<>
											<IconLoader2 className="animate-spin" />
											Posting
										</>
									) : (
										"Post to the board"
									)}
								</PortalButton>
							)
						) : (
							<LoginDialog
								trigger={
									<PortalButton variant="primary" className={submitClass}>
										Log in to post
									</PortalButton>
								}
							/>
						)}
					</div>
				)}
			</form>
		</PortalCard>
	);
}
