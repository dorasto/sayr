"use client";

import { useLocation, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { navigationActions } from "@/lib/navigation-store";
import { cn } from "@repo/ui/lib/utils";

export function NavigationTracker() {
	const location = useLocation();
	const pathname = location.pathname;
	const isLoading = useRouterState({ select: (s) => s.isLoading });
	const [showProgress, setShowProgress] = useState(false);
	const [progress, setProgress] = useState(0);
	const previousPathnameRef = useRef(pathname);

	useEffect(() => {
		// If we are NOT in settings, update the last dashboard route
		if (!pathname.startsWith("/settings")) {
			navigationActions.setLastDashboardRoute(pathname);
		}
	}, [pathname]);

	// Handle loading state with progress animation
	useEffect(() => {
		// Only show loading bar if the pathname is actually changing
		// (not just search params like ?view=priority-board)
		const isPathnameChange = pathname !== previousPathnameRef.current;

		if (isLoading && isPathnameChange) {
			setShowProgress(true);
			setProgress(0);

			// Animate to 70% over ~500ms
			const timer1 = setTimeout(() => setProgress(70), 100);

			return () => {
				clearTimeout(timer1);
			};
		}

		if (!isLoading && showProgress) {
			// Update the previous pathname ref when loading completes
			previousPathnameRef.current = pathname;

			// Complete to 100% quickly
			setProgress(100);

			// Hide after animation completes
			const timer = setTimeout(() => {
				setShowProgress(false);
				setProgress(0);
			}, 300);

			return () => clearTimeout(timer);
		}
	}, [isLoading, showProgress, pathname]);

	if (!showProgress) return null;

	return (
		<div
			className={cn(
				"fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-primary transition-all duration-300 ease-out origin-left",
				progress === 0 && "opacity-0"
			)}
			style={{
				width: `${progress}%`,
			}}
		/>
	);
}
