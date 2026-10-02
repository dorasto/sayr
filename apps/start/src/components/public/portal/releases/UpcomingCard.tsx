import { buttonVariants } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { formatDate } from "@repo/util";
import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { getReleaseDisplayDate } from "@/lib/portal/changelog";
import { getFirstSentence } from "@/lib/portal/release-notes";
import { ReleaseLead } from "./ReleaseLead";
import type { PublicRelease } from "./types";

interface UpcomingCardProps {
	release: PublicRelease;
	orgSlug: string;
}

/** Changelog card for a planned / in-progress release: "Coming next", target date, summary, lead and progress link. */
export function UpcomingCard({ release, orgSlug }: UpcomingCardProps) {
	const { date } = getReleaseDisplayDate(release);
	const summary = getFirstSentence(release.descriptionMarkdown);

	return (
		<Card className="rounded-xl border-primary/50 px-5 py-6 md:px-8 md:py-7">
			<div className="mb-2.5 flex items-center gap-2.5">
				<span className="font-semibold text-primary text-xs uppercase leading-4 tracking-[0.04em]">
					Coming next
				</span>
				{date && <span className="text-[13px] text-muted-foreground">Target {formatDate(date, "en-GB")}</span>}
			</div>
			<h2 className="font-bold text-2xl text-foreground leading-8 tracking-[-0.026em] md:text-[26px]">
				{release.name}
			</h2>
			{summary && <p className="mt-2 max-w-[600px] text-[15px] text-muted-foreground leading-6">{summary}</p>}
			<div className="mt-6 flex flex-wrap items-center gap-3">
				<ReleaseLead leadId={release.leadId} ring />
				<span className="grow" />
				<Link
					to="/orgs/$orgSlug/releases/$releaseSlug"
					params={{ orgSlug, releaseSlug: release.slug }}
					className={buttonVariants({ variant: "outline", size: "sm" })}
				>
					See progress
					<IconArrowRight aria-hidden className="size-[15px]" />
				</Link>
			</div>
		</Card>
	);
}
