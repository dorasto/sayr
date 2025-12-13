import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import {
	IconColumnInsertLeft,
	IconColumnInsertRight,
	IconGripHorizontal,
	IconGripVertical,
	IconRowInsertBottom,
	IconRowInsertTop,
	IconTextDecrease,
	IconTrash,
	IconX,
} from "@tabler/icons-react";
import type { Editor } from "prosekit/core";
import type { TableExtension } from "prosekit/extensions/table";
import { useEditorDerivedValue } from "prosekit/react";
import {
	TableHandleColumnRoot,
	TableHandleColumnTrigger,
	TableHandleDragPreview,
	TableHandleDropIndicator,
	TableHandlePopoverContent,
	TableHandlePopoverItem,
	TableHandleRoot,
	TableHandleRowRoot,
	TableHandleRowTrigger,
} from "prosekit/react/table-handle";

function getTableHandleState(editor: Editor<TableExtension>) {
	return {
		addTableColumnBefore: {
			canExec: editor.commands.addTableColumnBefore.canExec(),
			command: () => editor.commands.addTableColumnBefore(),
		},
		addTableColumnAfter: {
			canExec: editor.commands.addTableColumnAfter.canExec(),
			command: () => editor.commands.addTableColumnAfter(),
		},
		deleteCellSelection: {
			canExec: editor.commands.deleteCellSelection.canExec(),
			command: () => editor.commands.deleteCellSelection(),
		},
		deleteTableColumn: {
			canExec: editor.commands.deleteTableColumn.canExec(),
			command: () => editor.commands.deleteTableColumn(),
		},
		addTableRowAbove: {
			canExec: editor.commands.addTableRowAbove.canExec(),
			command: () => editor.commands.addTableRowAbove(),
		},
		addTableRowBelow: {
			canExec: editor.commands.addTableRowBelow.canExec(),
			command: () => editor.commands.addTableRowBelow(),
		},
		deleteTableRow: {
			canExec: editor.commands.deleteTableRow.canExec(),
			command: () => editor.commands.deleteTableRow(),
		},
		deleteTable: {
			canExec: editor.commands.deleteTable.canExec(),
			command: () => editor.commands.deleteTable(),
		},
	};
}

interface Props {
	dir?: "ltr" | "rtl";
}

export default function TableHandle(props: Props) {
	const state = useEditorDerivedValue(getTableHandleState);

	return (
		<TableHandleRoot className="contents">
			<TableHandleDragPreview />
			<TableHandleDropIndicator />
			<TableHandleColumnRoot className="h-[1.2em] w-[1.5em] translate-y-[80%] flex items-center box-border justify-center bg-accent hover:bg-muted rounded-lg p-0 overflow-hidden duration-150 transition-discrete transition data-[state=closed]:opacity-0 starting:opacity-0 opacity-100 data-[state=closed]:scale-95 starting:scale-95 scale-100">
				<TableHandleColumnTrigger className="flex items-center justify-center">
					<IconGripHorizontal className="size-3" />
				</TableHandleColumnTrigger>
				<TableHandlePopoverContent className="relative block max-h-100 min-w-32 select-none overflow-auto whitespace-nowrap p-1 z-10 box-border rounded-lg border bg-popover shadow-lg [&:not([data-state])]:hidden space-y-1">
					{state.addTableColumnBefore.canExec && (
						<TableHandlePopoverItem
							className="relative min-w-32 scroll-my-1 rounded-sm px-3 py-1.5 flex items-center justify-between gap-8 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 hover:data-[disabled=true]:opacity-50 data-danger:text-destructive box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-accent text-foreground"
							onSelect={state.addTableColumnBefore.command}
						>
							<div className="flex items-center gap-1">
								<IconColumnInsertLeft className="size-4" />
								<Label className="text-sm">Insert left</Label>
							</div>
						</TableHandlePopoverItem>
					)}
					{state.addTableColumnAfter.canExec && (
						<TableHandlePopoverItem
							className="relative min-w-32 scroll-my-1 rounded-sm px-3 py-1.5 flex items-center justify-between gap-8 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 hover:data-[disabled=true]:opacity-50 data-danger:text-destructive box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-accent text-foreground"
							onSelect={state.addTableColumnAfter.command}
						>
							<div className="flex items-center gap-1">
								<IconColumnInsertRight className="size-4" />
								<Label className="text-sm">Insert right</Label>
							</div>
						</TableHandlePopoverItem>
					)}
					{state.deleteCellSelection.canExec && (
						<TableHandlePopoverItem
							className="relative min-w-32 scroll-my-1 rounded-sm px-3 py-1.5 flex items-center justify-between gap-8 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 hover:data-[disabled=true]:opacity-50 data-danger:text-destructive box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-accent text-foreground"
							onSelect={state.deleteCellSelection.command}
						>
							<div className="flex items-center gap-1">
								<IconX className="size-4" />
								<Label className="text-sm">Clear content</Label>
							</div>
						</TableHandlePopoverItem>
					)}
					{state.deleteTableColumn.canExec && (
						<TableHandlePopoverItem
							className="relative min-w-32 scroll-my-1 rounded-sm px-3 py-1.5 flex items-center justify-between gap-8 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 hover:data-[disabled=true]:opacity-50 data-danger:text-destructive box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-accent text-foreground"
							onSelect={state.deleteTableColumn.command}
						>
							<div className="flex items-center gap-1">
								<IconTrash className="size-4" />
								<Label className="text-sm">Delete column</Label>
							</div>
						</TableHandlePopoverItem>
					)}
					<Separator />
					{state.deleteTable.canExec && (
						<TableHandlePopoverItem
							className="relative min-w-32 scroll-my-1 rounded-sm px-3 py-1.5 flex items-center justify-between gap-8 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 hover:data-[disabled=true]:opacity-50 data-danger:text-destructive box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-accent text-foreground"
							data-danger=""
							onSelect={state.deleteTable.command}
						>
							<div className="flex items-center gap-1">
								<IconTrash className="size-4" />
								<Label className="text-sm">Delete table</Label>
							</div>
						</TableHandlePopoverItem>
					)}
				</TableHandlePopoverContent>
			</TableHandleColumnRoot>
			<TableHandleRowRoot
				placement={props.dir === "rtl" ? "right" : "left"}
				className="h-[1.5em] w-[1.2em] ltr:translate-x-[80%] rtl:translate-x-[-80%] flex items-center box-border justify-center bg-accent hover:bg-muted rounded-lg p-0 overflow-hidden duration-150 transition-discrete transition data-[state=closed]:opacity-0 starting:opacity-0 opacity-100 data-[state=closed]:scale-95 starting:scale-95 scale-100"
			>
				<TableHandleRowTrigger className="flex items-center justify-center">
					<IconGripVertical className="size-3" />
				</TableHandleRowTrigger>
				<TableHandlePopoverContent className="relative block max-h-100 min-w-32 select-none overflow-auto whitespace-nowrap p-1 z-10 box-border rounded-lg border bg-popover shadow-lg [&:not([data-state])]:hidden space-y-1">
					{state.addTableRowAbove.canExec && (
						<TableHandlePopoverItem
							className="relative min-w-32 scroll-my-1 rounded-sm px-3 py-1.5 flex items-center justify-between gap-8 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 hover:data-[disabled=true]:opacity-50 data-danger:text-destructive box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-accent text-foreground"
							onSelect={state.addTableRowAbove.command}
						>
							<div className="flex items-center gap-1">
								<IconRowInsertTop className="size-4" />
								<Label className="text-sm">Insert above</Label>
							</div>
						</TableHandlePopoverItem>
					)}
					{state.addTableRowBelow.canExec && (
						<TableHandlePopoverItem
							className="relative min-w-32 scroll-my-1 rounded-sm px-3 py-1.5 flex items-center justify-between gap-8 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 hover:data-[disabled=true]:opacity-50 data-danger:text-destructive box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-accent text-foreground"
							onSelect={state.addTableRowBelow.command}
						>
							<div className="flex items-center gap-1">
								<IconRowInsertBottom className="size-4" />
								<Label className="text-sm">Insert below</Label>
							</div>
						</TableHandlePopoverItem>
					)}
					{state.deleteCellSelection.canExec && (
						<TableHandlePopoverItem
							className="relative min-w-32 scroll-my-1 rounded-sm px-3 py-1.5 flex items-center justify-between gap-8 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 hover:data-[disabled=true]:opacity-50 data-danger:text-destructive box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-accent text-foreground"
							onSelect={state.deleteCellSelection.command}
						>
							<div className="flex items-center gap-1">
								<IconX className="size-4" />
								<Label className="text-sm">Clear content</Label>
							</div>
						</TableHandlePopoverItem>
					)}
					{state.deleteTableRow.canExec && (
						<TableHandlePopoverItem
							className="relative min-w-32 scroll-my-1 rounded-sm px-3 py-1.5 flex items-center justify-between gap-8 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 hover:data-[disabled=true]:opacity-50 data-danger:text-destructive box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-accent text-foreground"
							onSelect={state.deleteTableRow.command}
						>
							<div className="flex items-center gap-1">
								<IconTrash className="size-4" />
								<Label className="text-sm">Delete row</Label>
							</div>
						</TableHandlePopoverItem>
					)}
					<Separator />
					{state.deleteTable.canExec && (
						<TableHandlePopoverItem
							className="relative min-w-32 scroll-my-1 rounded-sm px-3 py-1.5 flex items-center justify-between gap-8 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 hover:data-[disabled=true]:opacity-50 data-danger:text-destructive box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-accent text-foreground"
							data-danger=""
							onSelect={state.deleteTable.command}
						>
							<div className="flex items-center gap-1">
								<IconTrash className="size-4" />
								<Label className="text-sm">Delete table</Label>
							</div>
						</TableHandlePopoverItem>
					)}
				</TableHandlePopoverContent>
			</TableHandleRowRoot>
		</TableHandleRoot>
	);
}
