import { buttonVariants } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";
import { IconLock } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

interface PostingDisabledCardProps {
	orgSlug: string;
}

/** Shown instead of the new post form when the org is not taking public posts. */
export function PostingDisabledCard({ orgSlug }: PostingDisabledCardProps) {
	return (
		<Card className="mt-10 py-12">
			<div className="mx-auto flex max-w-[340px] flex-col items-center text-center">
				<span
					aria-hidden
					className="mb-3.5 inline-flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"
				>
					<IconLock className="size-6" />
				</span>
				<div className="font-semibold text-base text-foreground">Posting is turned off</div>
				<p className="mt-1.5 text-muted-foreground text-sm leading-[21px]">
					This board is not taking new posts right now. You can still read and upvote what is already there.
				</p>
				<Link
					to="/orgs/$orgSlug"
					params={{ orgSlug }}
					className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 max-md:h-11")}
				>
					Back to the board
				</Link>
			</div>
		</Card>
	);
}
