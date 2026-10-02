import { Button, buttonVariants } from "@repo/ui/components/button";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowUpRight, IconLink, IconX } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { usePostPublicUrl } from "@/hooks/portal/usePostPublicUrl";
import { usePeek } from "./peek-context";

/**
 * Header, right side: Copy link (canonical `/{shortId}` URL), Open full page, and the close action. The native close
 * button is switched off for this header (`showClose: false`) because it would close the whole panel; this one only
 * leaves the post (clears `?task`, back to the overview), the same X position the overview's native button has.
 */
export function PeekHeaderActions() {
	const { organization } = usePublicOrganizationLayout();
	const { shortId, closePost } = usePeek();
	const postPublicUrl = usePostPublicUrl();

	const copyLink = async () => {
		if (shortId === null) return;
		const url = postPublicUrl(organization.slug, shortId);
		try {
			await navigator.clipboard.writeText(url);
			headlessToast.success({ title: "Link copied" });
		} catch {
			headlessToast.error({ title: "Could not copy the link" });
		}
	};

	return (
		<>
			{shortId !== null && (
				<>
					<Button
						variant="ghost"
						size="icon"
						onClick={copyLink}
						aria-label="Copy link"
						title="Copy link"
						className="size-8"
					>
						<IconLink aria-hidden />
					</Button>
					<Link
						to="/orgs/$orgSlug/$shortId"
						params={{ orgSlug: organization.slug, shortId: String(shortId) }}
						className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8")}
					>
						Open full page
						<IconArrowUpRight aria-hidden />
					</Link>
				</>
			)}
			<Button variant="ghost" size="icon" onClick={closePost} aria-label="Close post" title="Close post">
				<IconX />
			</Button>
		</>
	);
}
