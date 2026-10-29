"use client";

import { IconPin, IconPinFilled, IconSettings, IconStack2 } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useActiveView } from "./use-active-view";
import { useBoardSavedViews } from "./use-board-saved-views";
import { DEFAULT_VIEW_COLOR, DEFAULT_VIEW_ICON, ViewIconColorTrigger } from "./view-icon-color-trigger";
import { viewSettingsActions } from "./view-settings-store";

/**
 * The right panel's own header content, handed to Page via
 * `panels.right.header.icon` — that slot renders completely unwrapped
 * (unlike `title`, which is a plain string forced through a truncating
 * span), so it's the right escape hatch for a custom icon+editable-name row
 * without widening the shared Page/IndentDrawer header API for one caller.
 *
 * Deliberately reads as data, not a control: no border/background at rest on
 * either the icon or the name, name is a borderless input that only shows
 * chrome on focus, saving on blur (Enter blurs early, Escape reverts).
 */
export function ActiveViewPanelHeader() {
	const { update: updateView } = useBoardSavedViews();
	const { activeView } = useActiveView();

	const [name, setName] = useState(activeView?.name ?? "");
	// biome-ignore lint/correctness/useExhaustiveDependencies: resync only when the active view (or its saved name) changes, not on every local keystroke
	useEffect(() => {
		setName(activeView?.name ?? "");
	}, [activeView?.id, activeView?.name]);

	if (!activeView) {
		return (
			<div className="flex min-w-0 items-center gap-2">
				<IconStack2 className="size-4 text-muted-foreground shrink-0" />
				<span className="truncate text-xs font-medium">All tasks</span>
			</div>
		);
	}

	const handleBlur = () => {
		const trimmed = name.trim();
		if (!trimmed || trimmed === activeView.name) {
			setName(activeView.name);
			return;
		}
		updateView(activeView.id, { name: trimmed });
	};

	return (
		<div className="flex min-w-0 items-center gap-2">
			<ViewIconColorTrigger
				value={{
					icon: activeView.viewConfig?.icon || DEFAULT_VIEW_ICON,
					color: activeView.viewConfig?.color || DEFAULT_VIEW_COLOR,
				}}
				onChange={({ icon, color }) =>
					updateView(activeView.id, {
						viewConfig: {
							mode: activeView.viewConfig?.mode ?? "list",
							groupBy: activeView.viewConfig?.groupBy ?? "status",
							subGroupBy: activeView.viewConfig?.subGroupBy,
							showCompletedTasks: activeView.viewConfig?.showCompletedTasks ?? true,
							sortBy: activeView.viewConfig?.sortBy,
							sortDirection: activeView.viewConfig?.sortDirection,
							icon,
							color,
						},
					})
				}
				className="size-6 shrink-0 rounded-md border-transparent bg-transparent shadow-none hover:bg-accent/50 [&_svg]:size-3.5"
			/>
			<input
				value={name}
				onChange={(event) => setName(event.target.value)}
				onBlur={handleBlur}
				onKeyDown={(event) => {
					if (event.key === "Enter") event.currentTarget.blur();
					if (event.key === "Escape") {
						setName(activeView.name);
						event.currentTarget.blur();
					}
				}}
				className="-mx-1 min-w-0 flex-1 truncate rounded px-1 bg-transparent text-xs font-medium outline-none focus:bg-accent"
			/>
		</div>
	);
}

/**
 * Pin/unpin toggle for the panel header's far-right `actions` slot — the panel's own
 * entry point for adding the active view to the Favourites sidebar (favourites-section.tsx),
 * since the breadcrumb ActiveViewSwitcher deliberately doesn't own pin/edit/delete. No-op
 * (renders nothing) with no active view — there's nothing to pin on "All tasks" — or when the
 * board's saved-views source has no pinning.
 */
export function ActiveViewPanelPinButton() {
	const { togglePin } = useBoardSavedViews();
	const { activeView } = useActiveView();

	if (!activeView || !togglePin) return null;

	return (
		<button
			type="button"
			onClick={() => togglePin(activeView.id)}
			title={activeView.pinned ? "Unpin from sidebar" : "Pin to sidebar"}
			className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
		>
			{activeView.pinned ? <IconPinFilled className="size-4" /> : <IconPin className="size-4" />}
		</button>
	);
}

/**
 * Opens the view settings sheet (view-settings-sheet.tsx) for the active view. Same size/look as the pin
 * button; renders nothing on "All tasks" or a preset (no saved view to edit).
 */
export function ActiveViewPanelSettingsButton() {
	const { activeView } = useActiveView();

	if (!activeView) return null;

	return (
		<button
			type="button"
			onClick={() => viewSettingsActions.open(activeView.id)}
			title="View settings"
			className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
		>
			<IconSettings className="size-4" />
		</button>
	);
}

/**
 * The panel header's `actions` slot on a board page with saved views: pin (when the board's saved-views source
 * supports pinning) + the view settings gear. Both hide when no saved view is active.
 */
export function ActiveViewPanelActions() {
	return (
		<div className="flex items-center">
			<ActiveViewPanelPinButton />
			<ActiveViewPanelSettingsButton />
		</div>
	);
}
