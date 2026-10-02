import { cn } from "@repo/ui/lib/utils";
import LoginDialog from "@/components/auth/login";
import { PortalButton } from "@/components/public/portal/ui/PortalButton";
import { VoteBox } from "@/components/public/portal/ui/VoteBox";
import { POST_COMMENT_COMPOSER_ID } from "./CommentComposer";
import { useCanAct } from "./useCanAct";

interface PostBottomBarProps {
	count: number;
	voted: boolean;
	disabled?: boolean;
	onToggleVote: () => void;
	taskStatus: string;
	className?: string;
}

function focusComposer() {
	const composer = document.getElementById(POST_COMMENT_COMPOSER_ID);
	if (!composer) return;
	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	composer.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
	composer.querySelector<HTMLElement>("[contenteditable='true']")?.focus({ preventScroll: true });
}

/**
 * Sticky mobile bar: the vote toggle (never login-gated) beside either "Log in to comment" or a button that jumps to
 * the comment box. Sticks to the bottom of the page's scroll container and respects the safe-area inset. Hide it on
 * desktop with `md:hidden` (the default).
 */
export function PostBottomBar({ count, voted, disabled, onToggleVote, taskStatus, className }: PostBottomBarProps) {
	const { isLoggedIn, canAct } = useCanAct(taskStatus);

	return (
		<div
			className={cn(
				"sticky bottom-0 z-10 flex items-center gap-2.5 border-portal-line border-t bg-portal-canvas px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden",
				className
			)}
		>
			<VoteBox
				count={count}
				voted={voted}
				disabled={disabled}
				onToggle={onToggleVote}
				className="h-12 w-auto min-w-[76px] flex-row gap-1.5 rounded-portal-md px-4"
			/>
			{!isLoggedIn ? (
				<LoginDialog
					trigger={
						<PortalButton variant="primary" size="lg" className="h-12 flex-1">
							Log in to comment
						</PortalButton>
					}
				/>
			) : canAct ? (
				<PortalButton variant="primary" size="lg" className="h-12 flex-1" onClick={focusComposer}>
					Add a comment
				</PortalButton>
			) : null}
		</div>
	);
}
