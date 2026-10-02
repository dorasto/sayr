import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { formatDate, formatDateTimeFromNow, getDisplayName } from "@repo/util";
import { IconChevronDown, IconChevronUp, IconLoader2, IconMessageCircle, IconX } from "@tabler/icons-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@repo/auth/client";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { healthConfig, type Health } from "@/components/releases/status-updates/types";
import { HealthPill } from "@/components/public/portal/releases/HealthPill";
import { PortalAvatar } from "@/components/public/portal/ui/PortalAvatar";
import { COMMENT_PROSE } from "@/components/public/portal/post/prose";
import {
	AdaptiveDialog,
	AdaptiveDialogContent,
	AdaptiveDialogHeader,
	AdaptiveDialogTitle,
} from "@repo/ui/components/adaptive-dialog";
import { Separator } from "@repo/ui/components/separator";
import type { NodeJSON } from "prosekit/core";
import processUploads from "@/components/prosekit/upload";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createReleaseCommentAction } from "@/lib/fetches/release";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { ServerEventMessage } from "@/lib/serverEvents";
import { onWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";

const Editor = lazy(() => import("@/components/prosekit/editor"));

const basePublicApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/public/v1" : "/api/public/v1";

interface PublicReleaseStatusUpdatesProps {
	organizationId: string;
	orgSlug: string;
	releaseSlug: string;
	releaseId: string;
	refreshKey?: number;
}

interface StatusUpdateData {
	id: string;
	releaseId: string;
	organizationId: string;
	content: schema.NodeJSON | null;
	health: "on_track" | "at_risk" | "off_track";
	visibility: "public" | "internal";
	createdAt: string;
	updatedAt: string;
	author: {
		id: string;
		name: string;
		image: string | null;
		createdAt: string;
	} | null;
	commentCount: number;
}

interface StatusUpdateComment {
	id: string;
	releaseId: string;
	organizationId: string;
	createdBy: schema.UserSummary | null;
	content: NodeJSON | null;
	visibility: "public" | "internal";
	parentId: string | null;
	statusUpdateId: string | null;
	replyCount: number;
	reactions?: {
		total: number;
		reactions: Record<string, { count: number; users: string[] }>;
	};
	createdAt: string;
	updatedAt: string;
}

const DEFAULT_VISIBLE_COUNT = 3;

export function PublicReleaseStatusUpdates({
	organizationId,
	orgSlug,
	releaseSlug,
	releaseId,
	refreshKey,
}: PublicReleaseStatusUpdatesProps) {
	const [updates, setUpdates] = useState<StatusUpdateData[]>([]);
	const [expanded, setExpanded] = useState(false);
	const [selectedUpdate, setSelectedUpdate] = useState<StatusUpdateData | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const { serverEvents, organization } = usePublicOrganizationLayout();
	const queryClient = useQueryClient();

	const loadUpdates = useCallback(async () => {
		try {
			const res = await fetch(`${basePublicApiUrl}/organization/${orgSlug}/releases/${releaseSlug}/status-updates`);
			if (!res.ok) throw new Error("Failed to fetch status updates");
			const data = await res.json();
			setUpdates(data.data?.updates ?? []);
		} catch (error) {
			console.error("Failed to load status updates:", error);
		}
	}, [orgSlug, releaseSlug]);

	// `refreshKey` is bumped by the page's UPDATE_RELEASE_STATUS_UPDATES handler.
	// biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is the trigger, not a value read here
	useEffect(() => {
		void loadUpdates();
	}, [loadUpdates, refreshKey]);

	// Keep selectedUpdate in sync with the latest fetched data so the open dialog
	// always reflects the current commentCount and other fields.
	// A ref is used to read the current selectedUpdate.id without making it a dep
	// (which would cause an infinite update loop since setSelectedUpdate triggers re-render).
	const selectedUpdateIdRef = useRef<string | null>(null);
	useEffect(() => {
		selectedUpdateIdRef.current = selectedUpdate?.id ?? null;
	}, [selectedUpdate]);

	useEffect(() => {
		const id = selectedUpdateIdRef.current;
		if (!id) return;
		const fresh = updates.find((u) => u.id === id);
		if (fresh) setSelectedUpdate(fresh);
	}, [updates]);

	// SSE handlers for real-time status update and comment events
	const handlers: WSMessageHandler<ServerEventMessage> = {
		UPDATE_RELEASE_COMMENTS: (msg) => {
			if (
				msg.scope === "PUBLIC" &&
				msg.meta?.orgId === organization.id &&
				(msg.data as { releaseId?: string })?.releaseId === releaseId
			) {
				queryClient.invalidateQueries({
					queryKey: ["status-update-comments"],
				});
				void loadUpdates();
			}
		},
	};
	const handleMessage = useWSMessageHandler<ServerEventMessage>(handlers);

	useEffect(() => {
		if (!serverEvents.event) return;
		serverEvents.event.addEventListener("message", handleMessage);
		return () => {
			serverEvents.event?.removeEventListener("message", handleMessage);
		};
	}, [serverEvents.event, handleMessage]);

	useEffect(() => {
		const unsubscribe = onWindowMessage<{ type: string }>("*", (msg) => {
			if (msg.type === "SSE_RECONNECTED") {
				void loadUpdates();
				queryClient.invalidateQueries({ queryKey: ["status-update-comments"] });
			}
		});
		return unsubscribe;
	}, [loadUpdates, queryClient]);

	const visibleUpdates = expanded ? updates : updates.slice(0, DEFAULT_VISIBLE_COUNT);
	const hasMore = updates.length > DEFAULT_VISIBLE_COUNT;

	const handleOpenUpdate = useCallback((update: StatusUpdateData) => {
		setSelectedUpdate(update);
		setDialogOpen(true);
	}, []);

	const handleCloseDialog = useCallback(() => {
		setDialogOpen(false);
		setSelectedUpdate(null);
	}, []);

	// No updates (or none loaded yet): the whole section stays out of the page.
	if (updates.length === 0) return null;

	return (
		<section>
			<h2 className="mb-6 font-semibold text-xl text-portal-fg leading-7 tracking-[-0.018em]">
				Updates from the team
				<span className="ml-2 font-medium text-portal-fg-3 text-sm tracking-normal">{updates.length}</span>
			</h2>

			<div>
				{visibleUpdates.map((update, index) => (
					<StatusUpdateItem
						key={update.id}
						update={update}
						isLast={index === visibleUpdates.length - 1}
						onOpenComments={() => handleOpenUpdate(update)}
					/>
				))}
			</div>

			{hasMore && (
				<button
					type="button"
					className="mt-2 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-portal-sm px-2.5 font-medium text-[13px] text-portal-fg-2 outline-none transition-colors hover:bg-portal-hover hover:text-portal-fg"
					onClick={() => setExpanded((v) => !v)}
				>
					{expanded ? (
						<>
							<IconChevronUp aria-hidden size={14} />
							Show fewer updates
						</>
					) : (
						<>
							<IconChevronDown aria-hidden size={14} />
							Show all {updates.length} updates
						</>
					)}
				</button>
			)}

			{selectedUpdate && (
				<StatusUpdateDialog
					open={dialogOpen}
					onOpenChange={handleCloseDialog}
					update={selectedUpdate}
					organizationId={organizationId}
					orgSlug={orgSlug}
					releaseSlug={releaseSlug}
				/>
			)}
		</section>
	);
}

interface StatusUpdateItemProps {
	update: StatusUpdateData;
	isLast: boolean;
	onOpenComments: () => void;
}

/** One entry of the "Updates from the team" timeline: ringed avatar + connector, name, health pill, date, content. */
function StatusUpdateItem({ update, isLast, onOpenComments }: StatusUpdateItemProps) {
	const { data: session } = authClient.useSession();
	const { tasks } = usePublicOrganizationLayout();
	const authorName = update.author ? getDisplayName(update.author) : "Team";
	const canOpenComments = update.commentCount > 0 || !!session?.user;

	return (
		<div className="flex gap-4">
			<div className="flex flex-col items-center">
				<PortalAvatar name={authorName} image={update.author?.image} size={32} ring />
				{!isLast && <span className="mt-2 w-px flex-1 bg-portal-line-2" />}
			</div>
			<div className={cn("min-w-0 flex-1", !isLast && "pb-7")}>
				<div className="flex min-h-6 flex-wrap items-center gap-2">
					<b className="font-semibold text-portal-fg">{authorName}</b>
					<HealthPill health={update.health} />
					{update.createdAt && (
						<time dateTime={update.createdAt} className="text-[13px] text-portal-fg-3">
							{formatDate(update.createdAt, "en-GB")}
						</time>
					)}
				</div>
				{update.content && (
					<div className={cn("mt-1.5", COMMENT_PROSE)}>
						<Suspense fallback={<div className="h-4 w-3/4 animate-pulse rounded bg-portal-raised" />}>
							<Editor
								readonly
								defaultContent={update.content as schema.NodeJSON}
								tasks={tasks}
								hideBlockHandle
							/>
						</Suspense>
					</div>
				)}
				{canOpenComments && (
					<button
						type="button"
						onClick={onOpenComments}
						className="mt-2 inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-2.5 font-medium text-[12.5px] text-portal-fg-3 outline-none transition-colors hover:bg-portal-hover hover:text-portal-fg"
					>
						<IconMessageCircle aria-hidden className="size-3.5" />
						{update.commentCount > 0
							? `${update.commentCount} ${update.commentCount === 1 ? "comment" : "comments"}`
							: "Comment"}
					</button>
				)}
			</div>
		</div>
	);
}

interface StatusUpdateDialogProps {
	open: boolean;
	onOpenChange: () => void;
	update: StatusUpdateData;
	organizationId: string;
	orgSlug: string;
	releaseSlug: string;
}

function StatusUpdateDialog({
	open,
	onOpenChange,
	update,
	organizationId,
	orgSlug,
	releaseSlug,
}: StatusUpdateDialogProps) {
	const { data: session } = authClient.useSession();
	const { categories, tasks } = usePublicOrganizationLayout();
	const queryClient = useQueryClient();
	const { value: sseClientId } = useStateManagement<string>("sseClientId", "");
	const [commentContent, setCommentContent] = useState<NodeJSON | undefined>(undefined);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editorKey, setEditorKey] = useState(0);

	// Fetch comments for this status update
	const {
		data: commentsData,
		isLoading: commentsLoading,
		refetch,
	} = useQuery({
		queryKey: ["status-update-comments", update.id],
		queryFn: async () => {
			const res = await fetch(
				`${basePublicApiUrl}/organization/${orgSlug}/releases/${releaseSlug}/comments?statusUpdateId=${update.id}&limit=50&direction=asc`
			);
			if (!res.ok) throw new Error("Failed to fetch comments");
			const data = await res.json();
			return data.data?.comments ?? [];
		},
		enabled: open,
		staleTime: 30_000,
	});

	const comments: StatusUpdateComment[] = commentsData ?? [];

	const handleSubmitComment = useCallback(async () => {
		if (!commentContent || isSubmitting) return;

		setIsSubmitting(true);
		try {
			const processedContent = await processUploads(
				commentContent,
				"public",
				organizationId,
				"public-status-update-comment"
			);
			const result = await createReleaseCommentAction(
				organizationId,
				update.releaseId,
				{
					content: processedContent,
					visibility: "public",
					statusUpdateId: update.id,
				},
				sseClientId
			);
			if (result.success) {
				setCommentContent(undefined);
				setEditorKey((k) => k + 1);
				queryClient.invalidateQueries({
					queryKey: ["status-update-comments", update.id],
				});
				refetch();
			} else {
				headlessToast.error({
					title: "Failed to post comment",
					description: result.error || "Something went wrong.",
				});
			}
		} catch (error) {
			console.error(error);
			headlessToast.error({
				title: "Failed to post comment",
				description: "Could not post your comment. Please try again.",
			});
		} finally {
			setIsSubmitting(false);
		}
	}, [commentContent, isSubmitting, organizationId, update.id, update.releaseId, sseClientId, queryClient, refetch]);

	const canComment = session?.user;

	const health = healthConfig[update.health as Health] ?? healthConfig.on_track;
	const authorName = update.author ? getDisplayName(update.author) : "Unknown";

	return (
		<AdaptiveDialog open={open} onOpenChange={onOpenChange}>
			<AdaptiveDialogContent className="z-50 border md:max-w-2xl" showClose={false}>
				<div className="flex flex-col max-h-[80vh]">
					{/* Header */}
					<AdaptiveDialogHeader className="pb-3 border-b">
						<div className="flex items-center justify-between w-full">
							<AdaptiveDialogTitle className="flex items-center gap-2">
								<Badge variant="outline" className={cn("gap-1 text-xs", health.className)}>
									{health.icon} {health.label}
								</Badge>
								<span className="text-sm font-semibold">Status Update</span>
							</AdaptiveDialogTitle>
							<Button variant="ghost" size="icon" className="h-7 w-7" onClick={onOpenChange}>
								<IconX className="size-4" />
							</Button>
						</div>
					</AdaptiveDialogHeader>

					{/* Content */}
					<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
						{/* Author and date */}
						<div className="flex items-center gap-2">
							{update.author?.image && (
								<img src={update.author.image} alt={authorName} className="size-6 rounded-full" />
							)}
							<span className="text-sm font-medium">{authorName}</span>
							<span className="text-xs text-muted-foreground">
								{update.createdAt && formatDate(update.createdAt)}
							</span>
						</div>

						{/* Content */}
						{update.content && (
							<Suspense fallback={<div className="h-4 animate-pulse bg-muted rounded w-3/4" />}>
								<Editor
									readonly
									defaultContent={update.content as schema.NodeJSON}
									tasks={tasks}
									hideBlockHandle
									className="text-sm"
								/>
							</Suspense>
						)}

						<Separator />

						{/* Comments Section */}
						<div className="flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<Label variant="subheading">Comments</Label>
								{comments.length > 0 && (
									<Label variant="description" className="text-xs text-muted-foreground">
										{comments.length} {comments.length === 1 ? "comment" : "comments"}
									</Label>
								)}
							</div>

							{commentsLoading ? (
								<div className="flex items-center justify-center py-4">
									<IconLoader2 className="animate-spin size-4 text-muted-foreground" />
								</div>
							) : comments.length === 0 ? (
								<p className="text-sm text-muted-foreground py-2 text-center">No comments yet.</p>
							) : (
								<div className="flex flex-col gap-3">
									{comments.map((comment) => (
										<div key={comment.id} className="flex gap-2">
											{comment.createdBy?.image && (
												<img
													src={comment.createdBy.image}
													alt={getDisplayName(comment.createdBy)}
													className="size-6 rounded-full shrink-0 mt-1"
												/>
											)}
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 mb-1">
													<span className="text-sm font-medium">
														{comment.createdBy ? getDisplayName(comment.createdBy) : "Anonymous"}
													</span>
													<span className="text-xs text-muted-foreground">
														{formatDateTimeFromNow(comment.createdAt)}
													</span>
												</div>
												{comment.content && (
													<Suspense
														fallback={<div className="h-3 animate-pulse bg-muted rounded w-1/2" />}
													>
														<Editor
															readonly
															defaultContent={comment.content as NodeJSON}
															tasks={tasks}
															hideBlockHandle
															className="text-sm"
														/>
													</Suspense>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Comment Input */}
					{canComment && (
						<div className="border-t p-3">
							<Suspense fallback={<div className="h-16 animate-pulse bg-muted rounded" />}>
								<Editor
									key={editorKey}
									firstLinePlaceholder="Write a comment..."
									className="p-2 bg-transparent"
									onChange={setCommentContent}
									submit={handleSubmitComment}
									categories={categories}
									tasks={tasks}
									hideBlockHandle
								/>
							</Suspense>
							<div className="flex items-center justify-end mt-2">
								<Button
									variant="primary"
									size="sm"
									onClick={handleSubmitComment}
									disabled={isSubmitting || !commentContent}
									className="h-7"
								>
									{isSubmitting ? <IconLoader2 className="animate-spin size-3" /> : "Comment"}
								</Button>
							</div>
						</div>
					)}
				</div>
			</AdaptiveDialogContent>
		</AdaptiveDialog>
	);
}
