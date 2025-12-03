"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { navigationActions } from "@/app/lib/navigation-store";

export function NavigationTracker() {
	const pathname = usePathname();

	useEffect(() => {
		// If we are NOT in settings, update the last dashboard route
		if (!pathname.startsWith("/admin/settings")) {
			navigationActions.setLastDashboardRoute(pathname);
		}
	}, [pathname]);

	return null;
}
