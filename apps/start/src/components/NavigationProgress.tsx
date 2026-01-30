import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { cn } from "@repo/ui/lib/utils";

/**
 * NavigationProgress shows a loading bar during hard navigations (path changes),
 * but not during query parameter changes.
 */
export function NavigationProgress() {
	const [isVisible, setIsVisible] = useState(false);
	const [progress, setProgress] = useState(0);
	const previousPathRef = useRef<string>("");

	// Track navigation state
	const isLoading = useRouterState({ select: (s) => s.isLoading });
	const currentPath = useRouterState({ select: (s) => s.location.pathname });

	// Detect if this is a hard navigation (path change) vs soft navigation (query params only)
	const isHardNavigation = isLoading && previousPathRef.current !== "" && previousPathRef.current !== currentPath;

	useEffect(() => {
		// Track path changes
		if (!isLoading) {
			previousPathRef.current = currentPath;
		}
	}, [currentPath, isLoading]);

	useEffect(() => {
		// Show loading indicator only for hard navigations
		if (isLoading && isHardNavigation) {
			setIsVisible(true);
			setProgress(30); // Start at 30%

			// Gradually increase progress
			const interval = setInterval(() => {
				setProgress((prev) => {
					if (prev >= 90) return prev; // Cap at 90% until actually done
					return prev + 10;
				});
			}, 300);

			return () => clearInterval(interval);
		}

		// Complete and hide the progress bar
		if (!isLoading && isVisible) {
			setProgress(100);

			// Hide after animation completes
			const timeout = setTimeout(() => {
				setIsVisible(false);
				setProgress(0);
			}, 200);

			return () => clearTimeout(timeout);
		}
	}, [isLoading, isHardNavigation, isVisible]);

	if (!isVisible) return null;

	return (
		<div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-transparent">
			<div
				className={cn("h-full bg-primary transition-all duration-200 ease-out")}
				style={{ width: `${progress}%` }}
			/>
		</div>
	);
}
