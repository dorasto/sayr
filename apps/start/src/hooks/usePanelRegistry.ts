"use client";

import { useMemo } from "react";
import { useStore } from "@tanstack/react-store";
import { panelStore } from "@/lib/panel-store";
import type { PanelSection } from "@/types/panel";

/**
 * Merges all panel registrations from the store into a single sorted list of sections.
 * Filters out sections with `show === false` and sorts by priority (lower = first).
 *
 * Returns `null` when no registrations exist (so the panel can hide itself entirely).
 */
export function usePanelRegistry() {
	const registrations = useStore(panelStore, (state) => state.registrations);

	const result = useMemo(() => {
		const entries = Object.values(registrations);
		if (entries.length === 0) return null;

		const allSections: PanelSection[] = [];
		const seenIds = new Set<string>();

		for (const registration of entries) {
			for (const section of registration.sections) {
				// Filter out hidden sections
				if (section.show === false) continue;

				// Deduplicate by section id
				if (seenIds.has(section.id)) continue;
				seenIds.add(section.id);

				allSections.push(section);
			}
		}

		// Sort by priority (lower = first), default 50
		allSections.sort((a, b) => (a.priority ?? 50) - (b.priority ?? 50));

		return {
			sections: allSections,
			// Use the first registration with a title as the panel title
			title: entries.find((r) => r.title)?.title,
			icon: entries.find((r) => r.icon)?.icon,
			// Use the first registration with a header as the panel header
			header: entries.find((r) => r.header)?.header,
		};
	}, [registrations]);

	return result;
}
