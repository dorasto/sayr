import type { schema } from "@repo/database";
import { onWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { ServerEventMessage } from "@/lib/serverEvents";
import { StatusUpdateDialog } from "./status-update-dialog";
import { StatusUpdateItem } from "./status-update-item";

const basePublicApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/public/v1" : "/api/public/v1";

const DEFAULT_VISIBLE_COUNT = 3;

/** A release status update as the public v1 endpoint returns it (JSON, so dates are ISO strings). */
export interface StatusUpdateData {
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

interface PublicReleaseStatusUpdatesProps {
	organizationId: string;
	orgSlug: string;
	releaseSlug: string;
	releaseId: string;
	refreshKey?: number;
}

/** "Updates from the team": the release's status update timeline (first three, expandable) and its comment dialog. */
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
			<h2 className="mb-6 font-semibold text-xl text-foreground leading-7 tracking-[-0.018em]">
				Updates from the team
				<span className="ml-2 font-medium text-muted-foreground text-sm tracking-normal">{updates.length}</span>
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
					className="mt-2 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 font-medium text-[13px] text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground"
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
