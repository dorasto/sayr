import type { schema } from "@repo/database";
import { Button, buttonVariants } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { cn } from "@repo/ui/lib/utils";
import { formatTaskKey } from "@repo/util";
import { IconCheck, IconLink } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { usePostPublicUrl } from "@/hooks/portal/usePostPublicUrl";

interface PostLiveCardProps {
	/** The post that was just created. */
	post: schema.TaskWithLabels;
	/** The title as submitted, for when the created post comes back without one. */
	fallbackTitle: string;
	orgSlug: string;
	orgShortId: schema.OrganizationWithMembers["shortId"];
	onPostAnother: () => void;
}

/** "Your post is live": replaces the new post form after a successful post, with links to it and "Post another". */
export function PostLiveCard({ post, fallbackTitle, orgSlug, orgShortId, onPostAnother }: PostLiveCardProps) {
	const headingRef = useRef<HTMLHeadingElement>(null);
	const postPublicUrl = usePostPublicUrl();
	const shortId = post.shortId;

	// This card replaces the form; move focus to its heading.
	useEffect(() => {
		headingRef.current?.focus();
	}, []);

	const copyLink = async () => {
		try {
			await navigator.clipboard.writeText(postPublicUrl(orgSlug, shortId ?? null));
			headlessToast.success({ title: "Link copied", id: "public-post-link" });
		} catch {
			headlessToast.error({
				title: "Could not copy the link",
				description: "Copy it from the address bar after opening the post.",
				id: "public-post-link",
			});
		}
	};

	return (
		<Card className="mt-10 p-6 max-md:mt-6 max-md:p-5">
			<div className="flex items-start gap-3.5">
				<span
					aria-hidden
					className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
				>
					<IconCheck className="size-[18px]" stroke={2.4} />
				</span>
				<div className="min-w-0 flex-1">
					<h2
						ref={headingRef}
						tabIndex={-1}
						className="font-semibold text-[17px] text-foreground tracking-[-0.01em] outline-none"
					>
						Your post is live
					</h2>
					<p className="mt-0.5 break-words text-muted-foreground text-sm">
						{post.title ?? fallbackTitle} · {formatTaskKey(orgShortId, shortId)}
					</p>
				</div>
			</div>
			<div className="mt-[18px] flex flex-wrap gap-2 max-md:flex-col">
				{shortId === null ? (
					<Link
						to="/orgs/$orgSlug"
						params={{ orgSlug }}
						className={cn(buttonVariants({ size: "sm" }), "max-md:h-11")}
					>
						View the board
					</Link>
				) : (
					<Link
						to="/orgs/$orgSlug/$shortId"
						params={{ orgSlug, shortId: String(shortId) }}
						className={cn(buttonVariants({ size: "sm" }), "max-md:h-11")}
					>
						View post
					</Link>
				)}
				<Button variant="outline" size="sm" className="max-md:h-11" onClick={() => void copyLink()}>
					<IconLink aria-hidden />
					Copy link
				</Button>
				<Button variant="ghost" size="sm" className="max-md:h-11" onClick={onPostAnother}>
					Post another
				</Button>
			</div>
		</Card>
	);
}
