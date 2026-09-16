"use client";

import { Button } from "@repo/ui/components/button";
import {
	ComboBox,
	ComboBoxContent,
	ComboBoxEmpty,
	ComboBoxGroup,
	ComboBoxItem,
	ComboBoxList,
	ComboBoxTrigger,
} from "@repo/ui/components/tomui/combo-box-unified";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronDown, IconPin, IconPinFilled, IconTrash } from "@tabler/icons-react";
import type React from "react";
import RenderIcon from "@/components/generic/RenderIcon";
import { useBoardViewState } from "../filter/use-board-view-state";
import { EditViewPopover } from "./edit-view-popover";
import { SaveViewPopover } from "./save-view-popover";
import { usePersonalViews } from "./use-personal-views";
import { DEFAULT_VIEW_COLOR, DEFAULT_VIEW_ICON } from "./view-icon-color-trigger";

const stopRowSelect = (event: React.SyntheticEvent) => event.stopPropagation();

/**
 * Plain-list form — no ComboBox chrome, since this is meant to sit directly
 * in board-side-panel.tsx (not inside a popover). Same pin/edit/delete/select
 * behavior as the top-bar PresetSwitcher below, just rendered as a list
 * instead of a dropdown menu.
 *
 * The row is a `<div role="button">`, not a real `<button>` — it used to be, but nesting the
 * pin/edit/delete `<button>`s inside an outer `<button>` is invalid HTML (a browser's HTML
 * parser auto-closes nested buttons, which caused a real hydration mismatch warning) and made
 * automated row-scoping brittle during Phase 2 testing. Keyboard activation (Enter/Space) is
 * preserved via onKeyDown.
 */
export function PresetSwitcherContent() {
	const { personalViews, togglePin, deleteView } = usePersonalViews();
	const { viewSlug, selectView, clearView } = useBoardViewState();

	if (personalViews.length === 0) {
		return <p className="text-xs text-muted-foreground px-1 py-2">No saved views yet.</p>;
	}

	return (
		<div className="flex flex-col gap-0.5">
			{personalViews.map((view) => {
				const isActive = (view.slug || view.id) === viewSlug;
				const onSelect = () => (isActive ? clearView() : selectView(view));
				return (
					// biome-ignore lint/a11y/useSemanticElements: row-select target; real buttons (pin/edit/delete) are nested inside, which isn't valid inside a <button>
					<div
						key={view.id}
						role="button"
						tabIndex={0}
						onClick={onSelect}
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								onSelect();
							}
						}}
						className={cn(
							"flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1.5 text-xs text-left transition-colors",
							isActive ? "bg-accent" : "hover:bg-accent/50"
						)}
					>
						<RenderIcon
							iconName={view.viewConfig?.icon || DEFAULT_VIEW_ICON}
							color={view.viewConfig?.color || DEFAULT_VIEW_COLOR}
							size={14}
							raw
						/>
						<span className="flex-1 truncate">{view.name}</span>
						<EditViewPopover view={view} />
						<button
							type="button"
							onPointerDown={stopRowSelect}
							onClick={(event) => {
								stopRowSelect(event);
								togglePin(view.id);
							}}
							className="shrink-0 text-muted-foreground hover:text-foreground"
							title={view.pinned ? "Unpin" : "Pin"}
						>
							{view.pinned ? <IconPinFilled className="size-3.5" /> : <IconPin className="size-3.5" />}
						</button>
						<button
							type="button"
							onPointerDown={stopRowSelect}
							onClick={(event) => {
								stopRowSelect(event);
								deleteView(view.id);
							}}
							className="shrink-0 text-muted-foreground hover:text-destructive"
							title="Delete view"
						>
							<IconTrash className="size-3.5" />
						</button>
					</div>
				);
			})}
		</div>
	);
}

/**
 * Compact top-bar switcher over the user's personal (cross-org) views —
 * pinned first (getPersonalViews already orders that way). Picking one
 * loads its filters+viewConfig via useBoardViewState's existing
 * selectView; picking the already-active one clears back to the default
 * view (ComboBox's own single-select toggle behavior).
 */
export function PresetSwitcher() {
	const { personalViews, togglePin, deleteView } = usePersonalViews();
	const { viewSlug, selectView, clearView } = useBoardViewState();

	const activeView = personalViews.find((view) => (view.slug || view.id) === viewSlug);

	return (
		<div className="flex items-center gap-1.5">
			<ComboBox
				value={viewSlug ?? undefined}
				onValueChange={(value) => {
					if (!value) {
						clearView();
						return;
					}
					const view = personalViews.find((v) => (v.slug || v.id) === value);
					if (view) selectView(view);
				}}
			>
				<ComboBoxTrigger asChild>
					<Button
						type="button"
						variant="outline"
						data-command-target="preset-switcher-trigger"
						className="h-6 gap-1.5 rounded-full px-2 text-xs shrink-0"
					>
						<span className="truncate max-w-32">{activeView ? activeView.name : "Views"}</span>
						<IconChevronDown className="size-3" />
					</Button>
				</ComboBoxTrigger>
				<ComboBoxContent className="w-64" align="start">
					<ComboBoxList>
						<ComboBoxEmpty>No saved views yet.</ComboBoxEmpty>
						<ComboBoxGroup>
							{personalViews.map((view) => (
								<ComboBoxItem
									key={view.id}
									value={view.slug || view.id}
									searchValue={view.name}
									showCheck={false}
								>
									<RenderIcon
										iconName={view.viewConfig?.icon || DEFAULT_VIEW_ICON}
										color={view.viewConfig?.color || DEFAULT_VIEW_COLOR}
										size={14}
										raw
									/>
									<span className="flex-1 truncate text-left">{view.name}</span>
									<EditViewPopover view={view} />
									<button
										type="button"
										onPointerDown={stopRowSelect}
										onClick={(event) => {
											stopRowSelect(event);
											togglePin(view.id);
										}}
										className="shrink-0 text-muted-foreground hover:text-foreground"
										title={view.pinned ? "Unpin" : "Pin"}
									>
										{view.pinned ? <IconPinFilled className="size-3.5" /> : <IconPin className="size-3.5" />}
									</button>
									<button
										type="button"
										onPointerDown={stopRowSelect}
										onClick={(event) => {
											stopRowSelect(event);
											deleteView(view.id);
										}}
										className="shrink-0 text-muted-foreground hover:text-destructive"
										title="Delete view"
									>
										<IconTrash className="size-3.5" />
									</button>
								</ComboBoxItem>
							))}
						</ComboBoxGroup>
					</ComboBoxList>
				</ComboBoxContent>
			</ComboBox>
			<SaveViewPopover />
		</div>
	);
}
