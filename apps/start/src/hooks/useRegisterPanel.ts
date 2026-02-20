"use client";

import { useEffect, useRef } from "react";
import { panelActions } from "@/lib/panel-store";
import type { PanelRegistration } from "@/types/panel";

/**
 * Register panel content into the global right panel from any component.
 * Content is automatically unregistered when the component unmounts.
 *
 * @param sourceId - Unique identifier for this registration (e.g., "task-detail", "release-info")
 * @param registration - PanelRegistration to register. Pass null/undefined to skip registration.
 */
export function useRegisterPanel(sourceId: string, registration: PanelRegistration | null | undefined) {
	const sourceIdRef = useRef(sourceId);
	sourceIdRef.current = sourceId;

	useEffect(() => {
		if (!registration) return;

		panelActions.registerPanel(sourceIdRef.current, registration);

		return () => {
			panelActions.unregisterPanel(sourceIdRef.current);
		};
	}, [registration]);
}
