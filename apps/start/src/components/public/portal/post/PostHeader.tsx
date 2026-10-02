import type { schema } from "@repo/database";
import { formatDate, formatTaskKey, getDisplayName } from "@repo/util";
import { Link } from "@tanstack/react-router";
import { CategoryTag } from "@/components/public/portal/ui/CategoryTag";
import { Pill } from "@/components/public/portal/ui/Pill";
import { PortalAvatar } from "@/components/public/portal/ui/PortalAvatar";
import { StatusChip } from "@/components/public/portal/ui/StatusChip";

interface PostHeaderProps {
	task: schema.TaskWithLabels;
	/** Org prefix for the task key (`SAY` in `SAY-55`). */
	orgShortId: string;
	orgSlug: string;
	category?: { name: string; color?: string | null; icon?: string | null } | null;
	/** Whether the post's creator is on the org's team. */
	creatorIsTeam: boolean;
	/** The parent post, only when it is known to be public. */
	parent?: { shortId: number | null; title: string | null } | null;
}

/**
 * Top of a post: status chip, category, key, optional "Part of" link, the `h1` title and the byline (avatar ringed when the
 * author is on the team, name, Author/Team pills, posted date).
 */
export function PostHeader({ task, orgShortId, orgSlug, category, creatorIsTeam, parent }: PostHeaderProps) {
	const creator = task.createdBy;
	const creatorName = creator ? getDisplayName(creator) : null;

	return (
		<header>
			<div className="mb-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-2">
				<StatusChip status={task.status} />
				{category && <CategoryTag category={category} />}
				<span className="text-[13px] text-portal-fg-3">{formatTaskKey(orgShortId, task.shortId)}</span>
			</div>

			{parent?.shortId != null && (
				<p className="mb-2 text-[13.5px] text-portal-fg-2">
					Part of{" "}
					<Link
						to="/orgs/$orgSlug/$shortId"
						params={{ orgSlug, shortId: String(parent.shortId) }}
						className="font-medium text-portal-accent-ink hover:underline focus-visible:underline"
					>
						{formatTaskKey(orgShortId, parent.shortId)}
						{parent.title ? ` ${parent.title}` : ""}
					</Link>
				</p>
			)}

			<h1 className="font-bold text-[28px] text-portal-fg leading-[34px] tracking-[-0.03em] md:text-4xl md:leading-[42px] md:tracking-[-0.032em]">
				{task.title}
			</h1>

			<div className="mt-4 mb-6 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[13.5px] text-portal-fg-2 md:mt-[18px] md:mb-7 md:text-sm">
				{creator && creatorName && (
					<>
						<PortalAvatar name={creatorName} image={creator.image} size={28} ring={creatorIsTeam} />
						<b className="font-semibold text-portal-fg">{creatorName}</b>
						<Pill variant="author" />
						{creatorIsTeam && <Pill variant="team" />}
					</>
				)}
				{task.createdAt && (
					<span>
						posted{" "}
						<time dateTime={new Date(task.createdAt).toISOString()}>{formatDate(task.createdAt, "en-GB")}</time>
					</span>
				)}
			</div>
		</header>
	);
}
