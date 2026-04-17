import type { schema } from "@repo/database";
import { cn } from "@repo/ui/lib/utils";
import { extractTaskText } from "@repo/util";
import { IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import {
	Tile,
	TileHeader,
	TileIcon,
	TileTitle,
	TileDescription,
} from "@repo/ui/components/doras-ui/tile";
import RenderIcon from "@/components/generic/RenderIcon";
import { getReleaseStatusConfig } from "@/components/releases/config";
import { Badge } from "@repo/ui/components/badge";

interface ReleaseCardProps {
	release: schema.releaseType;
	orgSlug: string;
	/** The continuous line color — passed from parent so the line is rendered there */
	lineColor?: string;
	isLast?: boolean;
}

function formatDate(date: Date | string | null | undefined): string {
	if (!date) return "";
	const d = date instanceof Date ? date : new Date(date);
	return d
		.toLocaleDateString("en-US", {
			month: "short",
			day: "2-digit",
			year: "numeric",
		})
		.toUpperCase();
}

export function ReleaseCard({ release, orgSlug, lineColor, isLast }: ReleaseCardProps) {
	const cfg = getReleaseStatusConfig(release.status);
	const color = lineColor ?? cfg?.color ?? "#6B7280";

	const primaryDate =
		release.status === "released" && release.releasedAt
			? release.releasedAt
			: release.targetDate ?? null;

	const dateLabel =
		release.status === "released" ? "Released" : release.targetDate ? "Target" : null;

	const descriptionPreview = extractTaskText(release.description);

	return (
		<div className="flex gap-4 md:gap-6">
			{/* Left: date column (desktop only) */}
			<div className="hidden md:flex flex-col items-end justify-start pt-4 w-32 shrink-0 gap-0.5 text-right">
				{primaryDate ? (
					<>
						{dateLabel && (
							<span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
								{dateLabel}
							</span>
						)}
						<span className="text-[11px] font-medium text-muted-foreground">
							{formatDate(primaryDate)}
						</span>
					</>
				) : (
					<span className="text-[11px] text-muted-foreground/40 italic">No date</span>
				)}
			</div>

			{/* Connector: continuous line with dot overlaid */}
			<div className="hidden md:flex shrink-0 flex-col items-center">
				{/* Line segment above dot (full height from top) */}
				<div
					className="w-px grow"
					style={{ backgroundColor: color, opacity: 0.2 }}
				/>
				{/* Dot */}
				<div
					className="size-2.5 rounded-full shrink-0 z-10 my-1"
					style={{ backgroundColor: color }}
				/>
				{/* Line segment below dot — hidden for last card */}
				<div
					className={cn("w-px grow", isLast && "opacity-0")}
					style={{ backgroundColor: color, opacity: isLast ? 0 : 0.2 }}
				/>
			</div>

			{/* Card */}
			<div className="flex-1 min-w-0 py-3">
				<Tile
					asChild
					className="md:w-full hover:bg-secondary cursor-pointer p-5 rounded-xl"
				>
					<Link
						to="/orgs/$orgSlug/releases/$releaseSlug"
						params={{ orgSlug, releaseSlug: release.slug }}
					>
						<TileHeader className="items-start gap-2">
							<div className="flex items-center gap-2.5 w-full">
								<TileIcon
									className="h-7 w-7 rounded-xl bg-transparent p-0 flex items-center justify-center shrink-0"
									style={{
										background: release.color ? `${release.color}20` : undefined,
										color:
											release.color && release.color !== "hsla(0, 0%, 0%, 1)"
												? release.color
												: cfg?.color,
									}}
								>
									{release.icon ? (
										<RenderIcon
											iconName={release.icon}
											color={release.color || "#ffffff"}
											button
											className={cn("size-5! [&_svg]:size-4! border-0")}
										/>
									) : (
										<div
											className="size-7 rounded-full flex items-center justify-center"
											style={{ backgroundColor: release.color || "#cccccc" }}
										>
											<IconRocket className="size-3.5 text-white" />
										</div>
									)}
								</TileIcon>
								<TileTitle className="text-base font-semibold">{release.name}</TileTitle>
							</div>

							{/* Mobile: date + status badge */}
							<div className="flex md:hidden items-center gap-2 flex-wrap">
								<Badge
									variant="outline"
									className={cn("text-[10px] px-1.5 py-0", cfg?.badgeClassName)}
								>
									{cfg?.label}
								</Badge>
								{primaryDate && (
									<span className="text-[11px] text-muted-foreground">
										{formatDate(primaryDate)}
									</span>
								)}
							</div>

							{descriptionPreview && (
								<TileDescription className="line-clamp-2 text-sm">
									{descriptionPreview}
								</TileDescription>
							)}
						</TileHeader>
					</Link>
				</Tile>
			</div>
		</div>
	);
}
