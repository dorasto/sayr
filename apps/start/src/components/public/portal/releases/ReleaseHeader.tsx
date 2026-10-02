import { formatDate } from "@repo/util";
import { IconRocket } from "@tabler/icons-react";
import RenderIcon from "@/components/generic/RenderIcon";
import { Pill } from "@/components/public/portal/ui/Pill";
import { getReleaseDisplayDate } from "@/lib/portal/changelog";
import { getReleaseTint } from "@/lib/portal/release-page";
import { ReleaseStatusChip } from "./ReleaseStatusChip";

interface ReleaseHeaderProps {
	release: {
		name: string;
		slug: string;
		status: string;
		icon: string | null;
		color: string | null;
		releasedAt?: Date | string | null;
		targetDate?: Date | string | null;
		createdAt?: Date | string | null;
	};
	/** First paragraph of the release description. */
	lede: string;
}

/** Top of the release page: icon tile, version pill, status, date, the `h1` name and the lede. */
export function ReleaseHeader({ release, lede }: ReleaseHeaderProps) {
	const tint = getReleaseTint(release.color);
	const { prefix, date } = getReleaseDisplayDate(release);

	return (
		<header>
			<div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
				<span
					aria-hidden
					className="flex size-11 shrink-0 items-center justify-center rounded-[13px] bg-portal-accent-soft text-portal-accent-ink"
					style={tint ? { background: `color-mix(in oklch, ${tint} 16%, transparent)`, color: tint } : undefined}
				>
					{release.icon ? (
						<RenderIcon iconName={release.icon} size={24} raw color="currentColor" />
					) : (
						<IconRocket className="size-6" stroke={1.8} />
					)}
				</span>
				<Pill variant="gh" className="h-[26px] text-[13px]">
					{release.slug}
				</Pill>
				<ReleaseStatusChip status={release.status} />
				{date && (
					<span className="text-[13.5px] text-portal-fg-3">
						{prefix} {formatDate(date, "en-GB")}
					</span>
				)}
			</div>
			<h1 className="font-bold text-[28px] text-portal-fg leading-[34px] tracking-[-0.03em] md:text-4xl md:leading-[42px] md:tracking-[-0.032em]">
				{release.name}
			</h1>
			{lede && <p className="mt-3 max-w-[640px] text-[15px] text-portal-fg-2 leading-6">{lede}</p>}
		</header>
	);
}
