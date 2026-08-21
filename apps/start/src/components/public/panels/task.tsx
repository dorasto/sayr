import { Button } from "@repo/ui/components/button";
import { Tile, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { extractHslValues, formatDate, generateSlug } from "@repo/util";
import { IconArrowUpRight, IconChevronUp, IconCircleFilled, IconTag } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import RenderIcon from "@/components/generic/RenderIcon";
import { getReleaseStatusConfig } from "@/components/releases/config";
import { InlineLabel } from "@/components/tasks";
import { priorityConfig, statusConfig } from "@/components/tasks/shared/config";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { usePublicTask } from "@/contexts/ContextPublicOrgTask";

/**
 * "Details" header for the public task detail side panel — org membership
 * gets an "Open internally" shortcut, everyone else just sees the title.
 */
export function PublicTaskPanelHeader() {
	const { organization } = usePublicOrganizationLayout();
	const { task, isMember } = usePublicTask();

	return (
		<div className="flex items-center gap-3 justify-between w-full">
			<Label className="text-sm font-semibold">Details</Label>
			{isMember && (
				<a
					href={`${import.meta.env.VITE_URL_ROOT}/${organization.id}/tasks/${task.shortId}`}
					target="_blank"
					rel="noopener noreferrer"
				>
					<Button variant="ghost" size="sm" className="h-6 gap-1 text-xs text-muted-foreground">
						<IconArrowUpRight className="" />
						Open internally
					</Button>
				</a>
			)}
		</div>
	);
}

/**
 * Vote/status/priority/category/release/label tiles for the public task
 * detail side panel. Pulls everything from `usePublicTask()`/
 * `usePublicOrganizationLayout()` so it only needs to be handed to the panel
 * once — it stays in sync on its own as task/vote state changes.
 */
export function PublicTaskPanelContent() {
	const { categories } = usePublicOrganizationLayout();
	const { task, release, orgSlug, isVoted, voteCount, handleVote } = usePublicTask();

	const status = statusConfig[task.status as keyof typeof statusConfig];
	const priority = priorityConfig[task.priority as keyof typeof priorityConfig];
	const category = categories.find((c) => c.id === task.category);

	return (
		<div className="flex flex-col gap-0">
			<div className="flex flex-col gap-1 p-1">
				{/* Vote button */}
				<Tile
					className={cn(
						"bg-card w-full cursor-pointer select-none hover:bg-accent md:w-full",
						isVoted ? "text-primary bg-primary/20" : "text-muted-foreground"
					)}
					onClick={handleVote}
				>
					<TileHeader className="w-full">
						<div className="flex flex-row gap-3 w-full">
							<TileTitle className="flex items-center gap-2">
								<TileIcon className={cn(isVoted ? "text-primary bg-primary/20" : "text-muted-foreground")}>
									<IconChevronUp />
								</TileIcon>
								Votes
							</TileTitle>
							<span className="ml-auto text-sm text-muted-foreground font-medium">{voteCount}</span>
						</div>
					</TileHeader>
				</Tile>

				{/* Status */}
				{status && (
					<Tile className="bg-card w-full select-none md:w-full">
						<TileHeader className="w-full">
							<div className="flex flex-row gap-3 w-full">
								<TileTitle className="flex items-center gap-2">
									<TileIcon
										style={{
											background: `hsla(${extractHslValues(status.hsla)}, 0.1)`,
										}}
									>
										{status.icon(cn(status.className, "size-4"))}
									</TileIcon>
									{status.label || task.status}
								</TileTitle>
							</div>
						</TileHeader>
					</Tile>
				)}

				{/* Priority */}
				{priority && task.priority !== "none" && (
					<Tile className="bg-card w-full select-none md:w-full">
						<TileHeader className="w-full">
							<div className="flex flex-row gap-3 w-full">
								<TileTitle className="flex items-center gap-2">
									<TileIcon>{priority.icon(cn(priority.className, "size-4"))}</TileIcon>
									{priority.label}
								</TileTitle>
							</div>
						</TileHeader>
					</Tile>
				)}

				{/* Category */}
				{category && (
					<Link to="/orgs/$orgSlug" params={{ orgSlug }} search={{ category: generateSlug(category.name) }}>
						<Tile className="bg-card w-full select-none hover:bg-accent cursor-pointer md:w-full">
							<TileHeader className="w-full">
								<div className="flex flex-row gap-3 w-full">
									<TileTitle className="flex items-center gap-2">
										<TileIcon
											style={{
												background: category.color
													? `hsla(${extractHslValues(category.color)}, 0.1)`
													: undefined,
											}}
										>
											<RenderIcon
												iconName={category.icon || "IconCategory"}
												size={16}
												color={category.color || undefined}
												raw
											/>
										</TileIcon>
										{category.name}
									</TileTitle>
								</div>
							</TileHeader>
						</Tile>
					</Link>
				)}
				{/* Release */}
				{release &&
					(() => {
						const releaseCfg = getReleaseStatusConfig(release.status);
						const releaseDateLabel = (() => {
							if (release.status === "released" && release.releasedAt) {
								return `${formatDate(release.releasedAt)}`;
							}
							if (release.targetDate) {
								return `Target ${formatDate(release.targetDate)}`;
							}
							return null;
						})();
						return (
							<Link to="/orgs/$orgSlug/releases/$releaseSlug" params={{ orgSlug, releaseSlug: release.slug }}>
								<Tile
									className="bg-card w-full flex-col gap-1 items-start select-none hover:bg-accent cursor-pointer md:w-full"
									style={{
										border: `1px solid hsla(${extractHslValues(releaseCfg.hsla)}, 0.5)`,
									}}
								>
									<TileHeader className="w-full gap-3">
										<div className="flex flex-row gap-3 w-full">
											<TileTitle className="flex items-center gap-2 w-full min-w-0">
												<TileIcon>
													<RenderIcon
														iconName={release.icon || "IconRocket"}
														size={16}
														color={
															release.status === "released"
																? releaseCfg.hsla
																: release.color || undefined
														}
														raw
													/>
												</TileIcon>
												<div className="flex flex-col min-w-0 w-full">
													<div className="flex items-center justify-between gap-2 min-w-0">
														<span className="truncate min-w-0">{release.name}</span>
														<span className="shrink-0 font-mono text-xs text-muted-foreground">
															{release.slug}
														</span>
													</div>
												</div>
											</TileTitle>
										</div>
									</TileHeader>
									<TileDescription asChild>
										<div className="flex items-center gap-2">
											{releaseCfg && (
												<InlineLabel
													text={`${releaseCfg.label} ${releaseDateLabel && ` - ${releaseDateLabel}`}`}
													icon={releaseCfg.icon("size-3")}
													className={cn(
														"rounded-xl pe-3 border pointer-events-none",
														releaseCfg.badgeClassName
													)}
												/>
											)}
										</div>
									</TileDescription>
								</Tile>
							</Link>
						);
					})()}

				{/* Labels */}
				{task.labels && task.labels.length > 0 && (
					<Tile className="bg-card w-full select-none md:w-full">
						<TileHeader className="w-full">
							<div className="flex flex-row gap-3 w-full">
								<TileTitle className="flex items-start gap-2">
									<TileIcon>
										<IconTag className="size-4 text-muted-foreground" />
									</TileIcon>
									<div className="flex items-center gap-1.5 flex-wrap">
										{task.labels.map((label) => (
											<span
												key={label.id}
												className="flex items-center gap-1.5 border rounded-full px-1 pr-2"
												style={{
													borderColor: label.color || "var(--border)",
													backgroundColor: label.color
														? `hsla(${extractHslValues(label.color)}, 0.1)`
														: undefined,
												}}
											>
												<IconCircleFilled
													size={12}
													style={{
														color: label.color || "var(--muted-foreground)",
													}}
												/>
												<span>{label.name}</span>
											</span>
										))}
									</div>
								</TileTitle>
							</div>
						</TileHeader>
					</Tile>
				)}
			</div>
		</div>
	);
}
