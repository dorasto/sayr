import { Card } from "@repo/ui/components/card";
import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { ReleaseLead } from "./ReleaseLead";
import { ReleaseNotes } from "./ReleaseNotes";
import type { PublicRelease } from "./types";

interface ReleasedCardProps {
	release: PublicRelease;
	orgSlug: string;
}

/** Changelog card for a shipped release: name, notes (clipped past 320px), lead and a link to the release page. */
export function ReleasedCard({ release, orgSlug }: ReleasedCardProps) {
	const { organization } = usePublicOrganizationLayout();
	// Past 320px the notes are clipped behind a fade and a "Read the full notes" link. Re-measured when the notes or
	// the width change.
	const notesRef = useRef<HTMLDivElement | null>(null);
	const [clipped, setClipped] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `descriptionMarkdown` is what changes the rendered height
	useEffect(() => {
		const el = notesRef.current;
		if (!el) return;
		const check = () => setClipped(el.scrollHeight > el.clientHeight + 1);
		check();
		const observer = new ResizeObserver(check);
		observer.observe(el);
		return () => observer.disconnect();
	}, [release.descriptionMarkdown]);

	const hasNotes = !!release.descriptionMarkdown?.trim();

	return (
		<Card className="rounded-xl px-5 py-6 md:px-8 md:py-7">
			<h2 className="font-bold text-[22px] text-foreground leading-[30px] tracking-[-0.024em] md:text-2xl">
				{release.name}
			</h2>
			{hasNotes && (
				<div className="relative mt-1">
					<div ref={notesRef} className="overflow-hidden" style={{ maxHeight: 320 }}>
						<ReleaseNotes
							markdown={release.descriptionMarkdown}
							orgPrefix={organization.shortId}
							orgSlug={orgSlug}
						/>
					</div>
					{clipped && (
						<>
							<div
								aria-hidden
								className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-card"
							/>
							<div className="relative mt-1">
								<Link
									to="/orgs/$orgSlug/releases/$releaseSlug"
									params={{ orgSlug, releaseSlug: release.slug }}
									className="inline-flex items-center gap-1.5 font-medium text-[13.5px] text-primary max-md:min-h-11 hover:underline focus-visible:underline"
								>
									Read the full notes
									<IconArrowRight aria-hidden className="size-3.5" />
								</Link>
							</div>
						</>
					)}
				</div>
			)}
			<div className="mt-6 mb-4 h-px bg-border" />
			<div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[13.5px] text-muted-foreground">
				<ReleaseLead leadId={release.leadId} />
				<span className="grow" />
				<Link
					to="/orgs/$orgSlug/releases/$releaseSlug"
					params={{ orgSlug, releaseSlug: release.slug }}
					className="inline-flex items-center gap-1.5 font-medium text-primary max-md:min-h-11 hover:underline focus-visible:underline"
				>
					View release
					<IconArrowRight aria-hidden className="size-3.5" />
				</Link>
			</div>
		</Card>
	);
}
