"use client";

import type { schema } from "@repo/database";
import { cn } from "@repo/ui/lib/utils";
import { extractHslValues, extractTaskText, formatCount, formatDateCompact } from "@repo/util";
import {
	IconCalendar,
	IconChevronUp,
	IconCircleFilled,
	IconHash,
	IconMessage,
} from "@tabler/icons-react";
import { nanoid } from "nanoid";
import { statusConfig } from "@/components/tasks/shared/config";
import RenderIcon from "@/components/generic/RenderIcon";
import { Tile, TileAction, TileDescription, TileHeader, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import { Button } from "@repo/ui/components/button";
import { InlineLabel } from "../tasks/shared/inlinelabel";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { Link } from "@tanstack/react-router";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";

interface PublicTaskItemProps {
	task: schema.TaskWithLabels;
	categories?: schema.categoryType[];
	voted?: boolean;
	onVote?: () => void;
}

export function PublicTaskItem({ task, categories = [], voted, onVote }: PublicTaskItemProps) {
	const status = statusConfig[task.status as keyof typeof statusConfig];
	const { organization } = usePublicOrganizationLayout();

	const descriptionPreview = extractTaskText(task.description);
	const taskCommentsCountString = task.comments?.length.toString() || "0";

	return (
		<Link
			to="/orgs/$orgSlug/$shortId"
			params={{ orgSlug: organization.slug, shortId: String(task.shortId) }}
			className="block"
		>
			<Tile className="md:w-full flex-col gap-3 items-start p-6 bg-accent hover:bg-secondary">
			<div className="flex items-center justify-between w-full gap-9">
				<TileHeader className="w-full">
					<TileTitle asChild>
						<Label variant={"heading"} className="text-lg font-bold">
							{task.title}
						</Label>
					</TileTitle>
					{descriptionPreview && (
						<TileDescription className="text-sm text-muted-foreground line-clamp-2">
							{descriptionPreview}
						</TileDescription>
					)}
					<div className="flex flex-wrap items-center gap-2">
						<InlineLabel
							text={formatDateCompact(task.createdAt as Date)}
							icon={<IconCalendar className="size-3" />}
							className=" ps-5 pe-1"
						/>

						<InlineLabel
							text={taskCommentsCountString}
							icon={<IconMessage className="size-3" />}
							className="rounded-lg ps-5 pe-1"
						/>
						<InlineLabel
							text={status?.label || task.status}
							icon={status?.icon(cn(status?.className, "size-3"))}
							className={cn("rounded-lg ps-5 pe-1")}
							style={{
								background: `hsla(${extractHslValues(status.hsla)}, 0.1)`,
							}}
						/>
						{(() => {
							const category = categories.find((c) => c.id === task.category);
							return category ? (
								<InlineLabel
									text={category.name}
									className={cn("rounded-lg ps-5 pe-1")}
									style={{
										background: category.color ? `hsla(${extractHslValues(category.color)}, 0.1)` : undefined,
									}}
									icon={
										<RenderIcon
											iconName={category.icon || "IconCategory"}
											size={12}
											color={category.color || undefined}
											raw
										/>
									}
								/>
							) : null;
						})()}
						{task.labels && task.labels.length > 0 && (
							<>
								<InlineLabel
									text={task.labels[0]?.name || ""}
									className={cn("rounded-lg ps-5 pe-1")}
									icon={
										<IconCircleFilled
											className={cn("size-3")}
											style={{
												color: task.labels[0]?.color || "var(--color-accent)",
											}}
										/>
									}
								/>
								{task.labels.length > 1 && (
									<Tooltip>
										<TooltipTrigger>
											<InlineLabel
												text={`+${task.labels.length - 1} more`}
												className={cn("bg-accent rounded-lg ps-5 pe-1")}
												icon={
													<div className="flex -space-x-1.5">
														{task.labels.slice(1, 4).map((label) => (
															<IconCircleFilled
																key={label.id + nanoid(5)}
																className="size-3"
																style={{
																	color: label.color || "var(--foreground)",
																}}
															/>
														))}
													</div>
												}
											/>
										</TooltipTrigger>
										<TooltipContent className="z-50">
											{task.labels.map((label) => (
												<div key={label.id} className="flex items-center gap-1">
													<IconCircleFilled
														className="size-3"
														style={{
															color: label.color || "var(--foreground)",
														}}
													/>
													<span className="text-sm">{label.name}</span>
												</div>
											))}
										</TooltipContent>
									</Tooltip>
								)}
							</>
						)}
						<InlineLabel
							text={task.shortId?.toString() || ""}
							icon={<IconHash className="size-3" />}
							className=" ps-5 pe-1"
						/>
					</div>
				</TileHeader>
				<TileAction className="justify-center">
					<Button
						variant="primary"
						data-no-propagate
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onVote?.();
						}}
						className={cn(
							"size-12 flex flex-col gap-0 aspect-square border-border font-bold bg-transparent hover:bg-primary/10 hover:border-primary",
							voted && "border-primary bg-primary/10"
						)}
					>
						<IconChevronUp />
						{formatCount(task.voteCount)}
					</Button>
				</TileAction>
			</div>
		</Tile>
		</Link>
	);
}
