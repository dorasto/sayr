"use client";

import { Button } from "@repo/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/components/dialog";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowDown } from "@tabler/icons-react";
import { CircleQuestionMark } from "lucide-react";
import type { ReactNode } from "react";
import { Children, isValidElement, useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../tooltip";

interface SplitDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	description?: string;
	children: ReactNode;
	className?: string;
	showTitle?: boolean;
	sidebarPosition?: "left" | "right"; // New prop for sidebar position
}

export function SplitDialog({
	isOpen,
	onOpenChange,
	title,
	description,
	children,
	className,
	showTitle = true,
	sidebarPosition = "left",
}: SplitDialogProps) {
	const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);
	const [showScrollButton, setShowScrollButton] = useState(false);
	const observersRef = useRef<{
		timeouts: NodeJS.Timeout[];
		resizeObserver?: ResizeObserver;
		mutationObserver?: MutationObserver;
		rafId?: number;
	}>({ timeouts: [] });

	// Extract SplitDialogContent and SplitDialogSide from children
	let contentComponent: ReactNode = null;
	let sideComponent: ReactNode = null;

	Children.forEach(children, (child) => {
		if (isValidElement(child)) {
			if (child.type === SplitDialogContent) {
				contentComponent = child;
			} else if (child.type === SplitDialogSide) {
				sideComponent = child;
			}
		}
	});

	// Callback ref to set the scroll container
	const scrollContainerRef = (node: HTMLDivElement | null) => {
		if (node) {
			setScrollContainer(node);
		}
	};

	useEffect(() => {
		if (!scrollContainer || !isOpen) {
			return;
		}

		let ticking = false;

		const checkScroll = () => {
			const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
			const hasScroll = scrollHeight > clientHeight;
			// More generous threshold (5px) to account for sub-pixel rendering
			const isAtBottom = scrollHeight - scrollTop - clientHeight < 5;

			// Show button only if there's scrollable content AND we're not at the bottom
			setShowScrollButton(hasScroll && !isAtBottom);
			ticking = false;
		};

		// Throttled scroll handler using requestAnimationFrame
		const handleScroll = () => {
			if (!ticking) {
				ticking = true;
				observersRef.current.rafId = requestAnimationFrame(checkScroll);
			}
		};

		// Check immediately and after delays (for async content)
		checkScroll();
		observersRef.current.timeouts = [setTimeout(checkScroll, 100), setTimeout(checkScroll, 500)];

		// Listen for scroll events (throttled)
		scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

		// Watch for size changes (e.g., content expanding)
		observersRef.current.resizeObserver = new ResizeObserver(checkScroll);
		observersRef.current.resizeObserver.observe(scrollContainer);

		// Watch for DOM changes (only childList changes, not attributes)
		observersRef.current.mutationObserver = new MutationObserver(checkScroll);
		observersRef.current.mutationObserver.observe(scrollContainer, {
			childList: true,
			subtree: true,
		});

		return () => {
			observersRef.current.timeouts.forEach(clearTimeout);
			scrollContainer.removeEventListener("scroll", handleScroll);
			observersRef.current.resizeObserver?.disconnect();
			observersRef.current.mutationObserver?.disconnect();
			if (observersRef.current.rafId) {
				cancelAnimationFrame(observersRef.current.rafId);
			}
		};
	}, [isOpen, scrollContainer]); // Depend on both isOpen and scrollContainer

	const scrollToBottom = () => {
		if (scrollContainer) {
			scrollContainer.scrollTo({
				top: scrollContainer.scrollHeight,
				behavior: "smooth",
			});
		}
	};

	// const sizeClasses = {
	// 	sm: "max-w-none md:max-w-lg",
	// 	md: "max-w-none md:max-w-xl",
	// 	lg: "max-w-none md:max-w-4xl",
	// 	xl: "max-w-none md:max-w-5xl",
	// };

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent
				showClose={false}
				className={cn(
					"flex h-[90dvh] max-w-[calc(var(--container-7xl)-3rem)] w-[calc(100vw-3rem)] p-0 gap-0 flex-col",
					"[&>button:last-child]:top-3.5 bg-popover",
					className
				)}
			>
				{description && <DialogDescription className="sr-only">{description}</DialogDescription>}

				{/* Header - Always sticky and above both content areas */}
				<div className="flex-shrink-0 p-4 w-full border-b">
					<div className="flex items-center w-full gap-3">
						<DialogTitle asChild>{title}</DialogTitle>
						{description && (
							<TooltipProvider delayDuration={0}>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button variant="outline" className="h-2 w-2 p-1">
											<CircleQuestionMark />
										</Button>
									</TooltipTrigger>
									<TooltipContent className="">
										<div className="space-y-1">
											<p className="text-[13px] font-semibold">{title}</p>
											<p className="text-foreground text-xs">{description}</p>
										</div>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)}
					</div>
				</div>

				{/* Content Area - Sidebar and Main Content side by side */}
				<div
					className={cn(
						"flex-1 overflow-hidden min-h-0 flex",
						sidebarPosition === "left" ? "flex-row" : "flex-row-reverse"
					)}
				>
					{/* Sidebar */}
					{sideComponent}

					{/* Main Content */}
					<div className="flex-1 min-h-0 relative">
						<div
							ref={scrollContainerRef}
							className={cn("overflow-y-auto h-full", sidebarPosition === "left" ? "border-l" : "border-r")}
						>
							{contentComponent}
						</div>

						{showScrollButton && (
							<Button
								size="icon"
								className="absolute bottom-4 right-4 rounded-full shadow-lg transition-opacity duration-200"
								onClick={scrollToBottom}
							>
								<IconArrowDown />
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

interface SplitDialogContentProps {
	children: ReactNode;
	className?: string;
}

export function SplitDialogContent({ children, className }: SplitDialogContentProps) {
	return <div className={cn("p-4 pb-0", className)}>{children}</div>;
}

interface SplitDialogSideProps {
	children: ReactNode;
	className?: string;
	width?: string;
}

export function SplitDialogSide({ children, className, width = "w-52" }: SplitDialogSideProps) {
	return <div className={cn("shrink-0 bg-popover overflow-y-auto p-4", width, className)}>{children}</div>;
}
