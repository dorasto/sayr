import type { schema } from "@repo/database";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useState } from "react";
import { type Health, type Visibility } from "./types";
import { StatusUpdateCard } from "./StatusUpdateCard";

interface UpdatesListProps {
	updates: schema.ReleaseStatusUpdateWithAuthor[];
	releaseId: string;
	orgId: string;
	sseClientId: string;
	currentUserId?: string;
	canManage: boolean;
	availableUsers: schema.UserSummary[];
	onDelete: (id: string) => void;
	onEdit: (
		id: string,
		data: Partial<{ content: schema.NodeJSON; health: Health; visibility: Visibility }>,
	) => Promise<boolean>;
	commentsRefreshKey?: number;
}

export function UpdatesList({
	updates,
	releaseId,
	orgId,
	sseClientId,
	currentUserId,
	canManage,
	availableUsers,
	onDelete,
	onEdit,
	commentsRefreshKey,
}: UpdatesListProps) {
	const [previousOpen, setPreviousOpen] = useState(false);
	const [latest, ...previous] = updates;

	const sharedCardProps = {
		releaseId,
		orgId,
		sseClientId,
		currentUserId,
		canManage,
		availableUsers,
		onDelete,
		onEdit,
		commentsRefreshKey,
	};

	return (
		<div className="flex flex-col gap-3">
			{latest && <StatusUpdateCard key={latest.id} update={latest} {...sharedCardProps} />}

			{previous.length > 0 && (
				<div className="flex flex-col gap-2">
					<button
						type="button"
						onClick={() => setPreviousOpen((v) => !v)}
						className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
					>
						{previousOpen ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
						{previousOpen
							? "Hide previous updates"
							: `${previous.length} previous update${previous.length === 1 ? "" : "s"}`}
					</button>

					{previousOpen && (
						<div className="flex flex-col gap-3 pl-3 border-l border-border">
							{previous.map((u) => (
								<StatusUpdateCard key={u.id} update={u} {...sharedCardProps} />
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
