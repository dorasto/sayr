import { headlessToast } from "@repo/ui/components/headless-toast";
import { IconCheck, IconLink } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { usePostPublicUrl } from "@/hooks/portal/usePostPublicUrl";
import { PortalButton, portalButtonVariants } from "../ui/PortalButton";
import { PortalCard } from "../ui/PortalCard";

interface PostLiveCardProps {
	orgSlug: string;
	/** Null only if the server did not return a short id; the card then links to the board instead. */
	shortId: number | null;
	/** Display key such as `SAY-91`. */
	taskKey: string;
	title: string;
	onPostAnother: () => void;
}

/** "Your post is live": shown in place of the form after a successful post, with View post, Copy link and Post another. */
export function PostLiveCard({ orgSlug, shortId, taskKey, title, onPostAnother }: PostLiveCardProps) {
	const postPublicUrl = usePostPublicUrl();
	const headingRef = useRef<HTMLHeadingElement>(null);

	useEffect(() => {
		headingRef.current?.focus();
	}, []);

	const copyLink = async () => {
		try {
			await navigator.clipboard.writeText(postPublicUrl(orgSlug, shortId));
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
		<PortalCard className="p-6 max-md:p-5">
			<div className="flex items-start gap-3.5">
				<span
					aria-hidden
					className="flex size-9 shrink-0 items-center justify-center rounded-full bg-portal-ok-soft text-portal-ok"
				>
					<IconCheck className="size-[18px]" stroke={2.4} />
				</span>
				<div className="min-w-0 flex-1">
					<h2
						ref={headingRef}
						tabIndex={-1}
						className="font-semibold text-[17px] text-portal-fg tracking-[-0.01em] outline-none"
					>
						Your post is live
					</h2>
					<p className="mt-0.5 break-words text-portal-fg-2 text-sm">
						{title} · {taskKey}
					</p>
				</div>
			</div>
			<div className="mt-[18px] flex flex-wrap gap-2 max-md:flex-col">
				{shortId === null ? (
					<Link
						to="/orgs/$orgSlug"
						params={{ orgSlug }}
						className={portalButtonVariants({ variant: "primary", size: "md" })}
					>
						View the board
					</Link>
				) : (
					<Link
						to="/orgs/$orgSlug/$shortId"
						params={{ orgSlug, shortId: String(shortId) }}
						className={portalButtonVariants({ variant: "primary", size: "md" })}
					>
						View post
					</Link>
				)}
				<PortalButton onClick={() => void copyLink()}>
					<IconLink aria-hidden />
					Copy link
				</PortalButton>
				<PortalButton variant="ghost" onClick={onPostAnother}>
					Post another
				</PortalButton>
			</div>
		</PortalCard>
	);
}
