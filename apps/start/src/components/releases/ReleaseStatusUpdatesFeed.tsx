import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconLoader2, IconPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import {
	createReleaseStatusUpdateAction,
	deleteReleaseStatusUpdateAction,
	getReleaseStatusUpdatesAction,
	updateReleaseStatusUpdateAction,
} from "@/lib/fetches/release";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutData } from "@/components/generic/Context";
import { type Health, type Visibility } from "./status-updates/types";
import { UpdateComposer } from "./status-updates/UpdateComposer";
import { UpdatesList } from "./status-updates/UpdatesList";

interface Props {
	releaseId: string;
	orgId: string;
	currentUserId?: string;
	canManage?: boolean;
	/** Increment to trigger a refetch of status updates (e.g. on SSE event) */
	refreshKey?: number;
	/** Increment to trigger a comment refresh inside each card (e.g. on SSE comment event) */
	commentsRefreshKey?: number;
}

export function ReleaseStatusUpdatesFeed({
	releaseId,
	orgId,
	currentUserId,
	canManage = false,
	refreshKey = 0,
	commentsRefreshKey = 0,
}: Props) {
	const { organization } = useLayoutOrganization();
	const { account } = useLayoutData();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");

	const [updates, setUpdates] = useState<schema.ReleaseStatusUpdateWithAuthor[]>([]);
	const [loading, setLoading] = useState(false);
	const [composerOpen, setComposerOpen] = useState(false);

	const availableUsers = organization.members.map((m) => m.user as schema.UserSummary);

	const loadUpdates = useCallback(async () => {
		setLoading(true);
		try {
			const result = await getReleaseStatusUpdatesAction(orgId, releaseId);
			if (result.success) setUpdates(result.data);
		} finally {
			setLoading(false);
		}
	}, [orgId, releaseId]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey intentionally triggers a re-fetch
	useEffect(() => {
		void loadUpdates();
	}, [loadUpdates, refreshKey]);

	const handlePost = useCallback(
		async (content: schema.NodeJSON, health: Health, visibility: Visibility) => {
			const result = await createReleaseStatusUpdateAction(
				orgId,
				releaseId,
				{ content, health, visibility },
				sseClientId,
			);
			if (result.success) {
				setComposerOpen(false);
				await loadUpdates();
			}
		},
		[orgId, releaseId, sseClientId, loadUpdates],
	);

	const handleEdit = useCallback(
		async (id: string, data: Partial<{ content: schema.NodeJSON; health: Health; visibility: Visibility }>) => {
			const result = await updateReleaseStatusUpdateAction(orgId, releaseId, id, data, sseClientId);
			if (result.success) await loadUpdates();
			return result.success;
		},
		[orgId, releaseId, sseClientId, loadUpdates],
	);

	const handleDelete = useCallback(
		async (id: string) => {
			await deleteReleaseStatusUpdateAction(orgId, releaseId, id);
			setUpdates((prev) => prev.filter((u) => u.id !== id));
		},
		[orgId, releaseId],
	);

	// Nothing to show for non-managers when empty
	if (!loading && updates.length === 0 && !canManage) return null;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<Label variant="subheading">Status updates</Label>
				{canManage && !composerOpen && (
					<Button variant="primary" size="sm" className="text-xs h-7 gap-1" onClick={() => setComposerOpen(true)}>
						<IconPlus size={14} />
						Post update
					</Button>
				)}
			</div>

			{composerOpen && (
				<UpdateComposer
					account={account}
					availableUsers={availableUsers}
					onPost={handlePost}
					onCancel={() => setComposerOpen(false)}
				/>
			)}

			{loading ? (
				<div className="flex items-center justify-center py-6">
					<IconLoader2 className="animate-spin size-5 text-muted-foreground" />
				</div>
			) : updates.length > 0 ? (
				<UpdatesList
					updates={updates}
					releaseId={releaseId}
					orgId={orgId}
					sseClientId={sseClientId}
					currentUserId={currentUserId}
					canManage={canManage}
					availableUsers={availableUsers}
					onDelete={handleDelete}
					onEdit={handleEdit}
					commentsRefreshKey={commentsRefreshKey}
				/>
			) : null}
		</div>
	);
}
