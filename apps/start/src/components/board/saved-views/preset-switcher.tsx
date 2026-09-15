"use client";

import {
	ComboBox,
	ComboBoxContent,
	ComboBoxEmpty,
	ComboBoxGroup,
	ComboBoxItem,
	ComboBoxList,
	ComboBoxTrigger,
} from "@repo/ui/components/tomui/combo-box-unified";
import { IconChevronDown, IconPin, IconPinFilled, IconTrash } from "@tabler/icons-react";
import { useBoardViewState } from "../filter/use-board-view-state";
import { SaveViewPopover } from "./save-view-popover";
import { usePersonalViews } from "./use-personal-views";

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

	const stopRowSelect = (event: React.SyntheticEvent) => event.stopPropagation();

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
					<button
						type="button"
						className="flex items-center gap-1.5 h-6 px-2 shrink-0 rounded-full text-xs border border-border text-muted-foreground hover:bg-accent transition-colors"
					>
						<span className="truncate max-w-32">{activeView ? activeView.name : "Views"}</span>
						<IconChevronDown className="size-3" />
					</button>
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
									<span className="flex-1 truncate text-left">{view.name}</span>
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
