"use client";

import { IconArrowUpRight, IconPlug, IconSettings } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";

import { useMemo } from "react";
import { commandStore } from "@/lib/command-store";
import type { CommandGroup, CommandMap } from "@/types/command";

export function useCommandRegistry() {
	const navigate = useNavigate();
	const registrations = useStore(commandStore, (state) => state.registrations);

	const commands: CommandMap = useMemo(() => {
		// Base static commands that are always available
		const baseCommands: CommandMap = {
			root: [
				{
					heading: "Navigation",
					priority: 30,
					items: [
						{
							id: "go-dashboard",
							label: "Dashboard",
							icon: <IconArrowUpRight size={16} className="opacity-60" aria-hidden="true" />,
							action: () => navigate({ to: "/" }),
							keywords: "home overview",
						},
					],
				},
				{
					heading: "Your account",
					priority: 40,
					items: [
						{
							id: "account-general",
							label: "General settings",
							icon: <IconSettings size={16} className="opacity-60" aria-hidden="true" />,
							action: () => navigate({ to: "/settings" }),
							keywords: "preferences profile",
						},
						{
							id: "account-connections",
							label: "Connections",
							icon: <IconPlug size={16} className="opacity-60" aria-hidden="true" />,
							action: () => navigate({ to: "/settings/connections" }),
							keywords: "integrations github oauth",
						},
					],
				},
			],
		};

		// Merge all dynamic registrations into the base commands
		const merged: CommandMap = { ...baseCommands };

		for (const registration of Object.values(registrations)) {
			for (const [viewId, groups] of Object.entries(registration)) {
				if (!merged[viewId]) {
					merged[viewId] = [];
				}
				merged[viewId] = [...merged[viewId], ...groups];
			}
		}

		// Sort groups by priority within each view
		for (const viewId of Object.keys(merged)) {
			const groups = merged[viewId];
			if (groups) {
				merged[viewId] = groups.sort((a: CommandGroup, b: CommandGroup) => {
					const aPriority = a.priority ?? 50;
					const bPriority = b.priority ?? 50;
					return aPriority - bPriority;
				});
			}
		}

		// Merge groups with the same heading within each view into a single group.
		// Uses the lowest priority (highest precedence) among the merged groups.
		for (const viewId of Object.keys(merged)) {
			const groups = merged[viewId];
			if (groups) {
				const headingMap = new Map<string, CommandGroup>();
				const order: string[] = [];
				for (const group of groups) {
					const key = group.heading ?? "";
					const existing = headingMap.get(key);
					if (existing) {
						existing.items = [...existing.items, ...group.items];
						existing.priority = Math.min(existing.priority ?? 50, group.priority ?? 50);
					} else {
						headingMap.set(key, { ...group, items: [...group.items] });
						order.push(key);
					}
				}
				merged[viewId] = order.map((key) => headingMap.get(key) as CommandGroup);
			}
		}

		// Filter out items where show === false
		for (const viewId of Object.keys(merged)) {
			const groups = merged[viewId];
			if (groups) {
				merged[viewId] = groups
					.map((group: CommandGroup) => ({
						...group,
						items: group.items.filter((item) => item.show !== false),
					}))
					.filter((group: CommandGroup) => group.items.length > 0);
			}
		}

		// Deduplicate items by ID within each view.
		// When multiple hooks register items with the same ID (e.g. "Create task"),
		// keep only the first occurrence (highest priority group wins after sorting).
		for (const viewId of Object.keys(merged)) {
			const groups = merged[viewId];
			if (groups) {
				const seenIds = new Set<string>();
				merged[viewId] = groups
					.map((group: CommandGroup) => ({
						...group,
						items: group.items.filter((item) => {
							if (seenIds.has(item.id)) return false;
							seenIds.add(item.id);
							return true;
						}),
					}))
					.filter((group: CommandGroup) => group.items.length > 0);
			}
		}

		return merged;
	}, [navigate, registrations]);

	return commands;
}
