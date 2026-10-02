import { IconCalendarOff, IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import type { PublicReleaseSummary } from "../board/useBoardSideData";

interface ReleaseColumnTitleProps {
	/** `null` for the "Unscheduled" column. */
	release: PublicReleaseSummary | null;
}

/** Header chip for a release column: rocket and the release name, linking to the release page ("Unscheduled" has no link). */
export function ReleaseColumnTitle({ release }: ReleaseColumnTitleProps) {
	const { organization } = usePublicOrganizationLayout();

	if (!release) {
		return (
			<span className="inline-flex h-6 items-center gap-[7px] whitespace-nowrap rounded-full bg-muted pr-2.5 pl-[9px] font-semibold text-[12.5px] text-foreground">
				<IconCalendarOff aria-hidden className="size-3.5" />
				Unscheduled
			</span>
		);
	}

	// Below `md` the link pads out (and pulls back with negative margins) to a bigger touch target around the chip.
	return (
		<Link
			to="/orgs/$orgSlug/releases/$releaseSlug"
			params={{ orgSlug: organization.slug, releaseSlug: release.slug }}
			className="group -mx-1 -my-2.5 inline-flex px-1 py-2.5 outline-none md:m-0 md:p-0"
		>
			<span className="inline-flex h-6 items-center gap-[7px] whitespace-nowrap rounded-full bg-muted pr-2.5 pl-[9px] font-semibold text-[12.5px] text-foreground group-hover:bg-accent">
				<IconRocket aria-hidden className="size-3.5" />
				{release.name}
			</span>
		</Link>
	);
}
