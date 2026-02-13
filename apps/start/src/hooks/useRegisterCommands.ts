"use client";

import { useEffect, useRef } from "react";
import { commandActions } from "@/lib/command-store";
import type { CommandMap } from "@/types/command";

/**
 * Register commands into the global command palette from any component.
 * Commands are automatically unregistered when the component unmounts.
 *
 * @param sourceId - Unique identifier for this registration (e.g., "org-commands", "task-commands")
 * @param commands - CommandMap to register. Pass null/undefined to skip registration.
 * @param deps - Dependency array to trigger re-registration (similar to useEffect deps)
 */
export function useRegisterCommands(sourceId: string, commands: CommandMap | null | undefined) {
	const sourceIdRef = useRef(sourceId);
	sourceIdRef.current = sourceId;

	useEffect(() => {
		if (!commands) return;

		commandActions.registerCommands(sourceIdRef.current, commands);

		return () => {
			commandActions.unregisterCommands(sourceIdRef.current);
		};
	}, [commands]);
}
