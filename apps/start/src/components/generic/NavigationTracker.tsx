"use client";

import { useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { navigationActions } from "@/lib/navigation-store";

export function NavigationTracker() {
	const location = useLocation();
	const pathname = location.pathname;

	useEffect(() => {
		// If we are NOT in settings, update the last dashboard route
		if (!pathname.startsWith("/admin/settings")) {
			navigationActions.setLastDashboardRoute(pathname);
		}
	}, [pathname]);

	return null;
}
