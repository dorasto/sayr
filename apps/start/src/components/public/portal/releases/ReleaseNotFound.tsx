import { buttonVariants } from "@repo/ui/components/button";
import { IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

interface ReleaseNotFoundProps {
	orgSlug: string;
}

/** Release page fallback when the release does not exist (or the org's public page is off). */
export function ReleaseNotFound({ orgSlug }: ReleaseNotFoundProps) {
	return (
		<div className="h-full overflow-y-auto">
			<div className="mx-auto flex w-full max-w-[1120px] justify-center px-4 py-24 md:px-6">
				<div className="mx-auto flex max-w-[340px] flex-col items-center text-center">
					<span
						aria-hidden
						className="mb-3.5 inline-flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"
					>
						<IconRocket className="size-6" />
					</span>
					<div className="font-semibold text-base text-foreground">Release not found</div>
					<p className="mt-1.5 text-muted-foreground text-sm leading-[21px]">
						It may have been removed, or the link is wrong.
					</p>
					<div className="mt-4 flex flex-wrap items-center justify-center gap-2">
						<Link
							to="/orgs/$orgSlug/releases"
							params={{ orgSlug }}
							className={buttonVariants({ variant: "outline", size: "sm" })}
						>
							Back to the changelog
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
