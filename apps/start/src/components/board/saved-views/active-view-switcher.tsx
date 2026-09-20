import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { cn } from "@repo/ui/lib/utils";
import {
  IconCheck,
  IconChevronDown,
  IconRotate2,
  IconStack2,
  IconTrash,
} from "@tabler/icons-react";
import type React from "react";
import { useState } from "react";
import RenderIcon from "@/components/generic/RenderIcon";
import { serializeFilters } from "../filter/serialization";
import {
  mapStateToViewConfig,
  useBoardViewState,
} from "../filter/use-board-view-state";
import { EditViewPopover } from "./edit-view-popover";
import { SaveViewPopover } from "./save-view-popover";
import { useActiveView } from "./use-active-view";
import { usePersonalViews } from "./use-personal-views";
import {
  DEFAULT_VIEW_COLOR,
  DEFAULT_VIEW_ICON,
} from "./view-icon-color-trigger";

// Nested Save/Reset/Delete buttons live inside a clickable DropdownMenuItem row (the row's own
// onClick selects the view) — stop the event before it bubbles so pressing one doesn't also
// select the row.
const stopRowSelect = (event: React.SyntheticEvent) => event.stopPropagation();

// The Save/Edit popovers (and the icon picker inside them) are portalled out of the menu's DOM but
// are still React children of its popup, so their key events bubble into Base UI's menu typeahead,
// which preventDefault()s every printable key — typing in the name field or icon search did nothing.
// A key that didn't originate inside the popup's own DOM isn't a menu key; opt it out of Base UI's
// handlers (their documented escape hatch, and it runs before the menu's own onKeyDown).
const ignoreNestedPopoverKeys: React.ComponentProps<
  typeof DropdownMenuContent
>["onKeyDown"] = (event) => {
  if (!event.currentTarget.contains(event.target as Node))
    event.preventBaseUIHandler();
};

// size-5 + the [&_svg]:size-3 override is the same "tinted background swatch" shape
// view-icon-color-trigger.tsx's own trigger uses (RenderIcon's `button` mode, just smaller) —
// reused here instead of `raw` so an item's color shows as a filled swatch, not just an icon
// tint, matching the assignee/label picker's own colored-row treatment.
const ICON_SWATCH_CLASS = "size-5 rounded-md [&_svg]:size-3 shrink-0";

/**
 * Breadcrumb-style saved-view switcher for /home's PageHeader.Identity zone, mirroring
 * /:orgId/tasks' own view dropdown there. This is the ONLY place view management lives now —
 * select, dirty-aware reset/update, edit (rename/icon/color), delete, and save-as-new-view.
 * Pin/unpin is the one exception, kept in active-view-panel-header.tsx's
 * ActiveViewPanelPinButton (the panel header's own entry point); board-side-panel.tsx no
 * longer has any view listing/edit/delete of its own.
 */
export function ActiveViewSwitcher() {
  const [updating, setUpdating] = useState(false);
  const { personalViews, updateView, deleteView } = usePersonalViews();
  const { filters, viewConfig, selectView, resetToSavedView, clearView } =
    useBoardViewState();
  const { activeView, isDirtyFromActiveView, isDirty } = useActiveView();

  const handleUpdate = async (event: React.SyntheticEvent) => {
    stopRowSelect(event);
    if (!activeView || updating) return;
    setUpdating(true);
    try {
      await updateView(activeView.id, {
        filterParams: serializeFilters(filters),
        viewConfig: mapStateToViewConfig(viewConfig, {
          icon: activeView.viewConfig?.icon || DEFAULT_VIEW_ICON,
          color: activeView.viewConfig?.color || DEFAULT_VIEW_COLOR,
        }),
      });
      headlessToast.success({ title: "View updated" });
    } catch {
      headlessToast.error({ title: "Failed to update view" });
    } finally {
      setUpdating(false);
    }
  };

  const handleReset = (event: React.SyntheticEvent) => {
    stopRowSelect(event);
    if (activeView) resetToSavedView(activeView);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="primary"
            className="w-fit text-xs p-1 h-auto bg-transparent gap-1 max-w-40"
            size="sm"
            data-command-target="active-view-switcher-trigger"
          />
        }
      >
        {activeView ? (
          <RenderIcon
            iconName={activeView.viewConfig?.icon || DEFAULT_VIEW_ICON}
            color={activeView.viewConfig?.color || DEFAULT_VIEW_COLOR}
            button
            className={ICON_SWATCH_CLASS}
          />
        ) : (
          <IconStack2 className="size-3.5 text-muted-foreground" />
        )}
        <span className="truncate">
          {activeView ? activeView.name : "All tasks"}
        </span>
        {isDirty && (
          <span
            className="size-1.5 shrink-0 rounded-full bg-primary"
            title="Unsaved changes"
          />
        )}
        <IconChevronDown className="size-3 text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-72 max-w-96"
        onKeyDown={ignoreNestedPopoverKeys}
      >
        <DropdownMenuItem
          onClick={() => clearView()}
          className={cn(!activeView && "bg-accent")}
        >
          <IconStack2 className="size-4 text-muted-foreground" />
          All tasks
          {/*{!activeView && <IconCheck className="ml-auto size-4 shrink-0" />}*/}
        </DropdownMenuItem>
        {personalViews.length > 0 && (
          <DropdownMenuSeparator className="bg-border" />
        )}
        <DropdownMenuGroup className={""}>
          {personalViews.map((view) => {
            const isActive = activeView?.id === view.id;
            const showResetUpdate = isActive && isDirtyFromActiveView;
            return (
              <DropdownMenuItem
                key={view.id}
                onClick={() => selectView(view)}
                className={cn("group/item", isActive && "bg-accent")}
              >
                <RenderIcon
                  iconName={view.viewConfig?.icon || DEFAULT_VIEW_ICON}
                  color={view.viewConfig?.color || DEFAULT_VIEW_COLOR}
                  button
                  className={ICON_SWATCH_CLASS}
                />
                <span className="truncate">{view.name}</span>
                <span className="ml-auto flex items-center gap-0.5 shrink-0">
                  {showResetUpdate && (
                    <>
                      <Button
                        aria-label="Reset changes"
                        onPointerDown={stopRowSelect}
                        onClick={handleReset}
                        className="rounded p-1 text-foreground/0 hover:text-foreground group-hover/item:text-muted-foreground transition-all w-fit h-fit"
                        variant="ghost"
                        tooltipText="Reset changes"
                      >
                        <IconRotate2 className="size-3.5" />
                      </Button>
                      <Button
                        aria-label="Save changes"
                        disabled={updating}
                        onPointerDown={stopRowSelect}
                        onClick={handleUpdate}
                        className="rounded p-1 text-foreground/0 hover:text-foreground group-hover/item:text-muted-foreground transition-all w-fit h-fit disabled:opacity-50"
                        variant="ghost"
                        tooltipText="Save changes"
                      >
                        <IconCheck className="size-3.5" />
                      </Button>
                    </>
                  )}
                  {/*{!showResetUpdate && isActive && (
                    <IconCheck className="size-4 shrink-0" />
                  )}*/}
                  <EditViewPopover
                    view={view}
                    triggerClassName="text-foreground/0 hover:text-foreground group-hover/item:text-muted-foreground transition-all"
                  />
                  <Button
                    aria-label="Delete view"
                    onPointerDown={stopRowSelect}
                    onClick={(event) => {
                      stopRowSelect(event);
                      deleteView(view.id);
                    }}
                    className="rounded p-1 text-foreground/0 hover:text-destructive group-hover/item:text-muted-foreground transition-all w-fit h-fit"
                    variant="ghost"
                    tooltipText="Delete view"
                  >
                    <IconTrash className="size-3.5" />
                  </Button>
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        {isDirty && (
          <>
            <DropdownMenuSeparator />
            <SaveViewPopover
              triggerLabel={activeView ? "Save as new view" : "Save view"}
              triggerVariant="ghost"
              triggerClassName="w-full h-auto justify-start gap-2 rounded-xl px-2 py-1.5 text-sm font-normal text-foreground hover:bg-accent hover:text-accent-foreground"
            />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
