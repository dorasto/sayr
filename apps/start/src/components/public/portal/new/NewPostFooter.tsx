import { authClient } from "@repo/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button, buttonVariants } from "@repo/ui/components/button";
import { ensureCdnUrl, getInitials } from "@repo/util";
import { IconLoader2 } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import LoginDialog from "@/components/auth/login";

interface NewPostFooterProps {
	orgSlug: string;
	loggedIn: boolean;
	isSubmitting: boolean;
	/** The form is not ready to post yet (no title, or a required template is missing). */
	disabled: boolean;
	onSubmit: () => void;
	/** Leaving the form throws the draft away. */
	onCancel: () => void;
}

/**
 * The new post form's footer: who the post goes up as, Cancel, and the post button (a login dialog trigger when logged
 * out). Sticky at the bottom of the sheet on phones.
 */
export function NewPostFooter({ orgSlug, loggedIn, isSubmitting, disabled, onSubmit, onCancel }: NewPostFooterProps) {
	const { data: session } = authClient.useSession();
	const userName = session?.user?.name?.trim() || "you";

	return (
		<div className="flex items-center gap-3 border-t py-3 max-md:sticky max-md:bottom-0 max-md:z-10 max-md:-mx-4 max-md:flex-col max-md:items-stretch max-md:gap-2.5 max-md:rounded-none max-md:bg-background max-md:px-4 max-md:pt-3 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
			<div className="flex min-w-0 flex-1 items-center gap-3 text-[13.5px] text-muted-foreground max-md:flex-none max-md:text-xs">
				{loggedIn ? (
					<>
						<Avatar className="size-6 max-md:hidden">
							{session?.user?.image ? (
								<AvatarImage src={ensureCdnUrl(session.user.image)} alt={session.user.name ?? ""} />
							) : null}
							<AvatarFallback className="font-semibold text-xs">
								{getInitials(session?.user?.name)}
							</AvatarFallback>
						</Avatar>
						<span className="min-w-0 truncate">
							Posting as <b className="font-semibold text-foreground">{userName}</b>
							<span aria-hidden> · </span>
							your post will be public
						</span>
					</>
				) : (
					<span>You will log in before your post goes up. Your post will be public.</span>
				)}
			</div>
			<Link
				to="/orgs/$orgSlug"
				params={{ orgSlug }}
				onClick={onCancel}
				className={buttonVariants({ variant: "ghost", size: "sm" })}
			>
				Cancel
			</Link>
			{loggedIn ? (
				<Button
					size="sm"
					className="max-md:h-12 max-md:w-full"
					onClick={onSubmit}
					disabled={isSubmitting || disabled}
				>
					{isSubmitting ? (
						<>
							<IconLoader2 aria-hidden className="animate-spin" />
							Posting
						</>
					) : (
						"Post to the board"
					)}
				</Button>
			) : (
				<LoginDialog
					trigger={
						<Button size="sm" className="max-md:h-12 max-md:w-full">
							Post to the board
						</Button>
					}
				/>
			)}
		</div>
	);
}
