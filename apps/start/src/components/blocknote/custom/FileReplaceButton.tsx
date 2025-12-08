import {
	type BlockSchema,
	blockHasType,
	type InlineContentSchema,
	type StyleSchema,
} from "@blocknote/core";
import {
	useBlockNoteEditor,
	useComponentsContext,
	useDictionary,
	useSelectedBlocks,
} from "@blocknote/react";
import { IconFileImport } from "@tabler/icons-react";
import { useMemo } from "react";
import { CustomFilePanel } from "./CustomFilePanel";

/**
 * Custom FileReplaceButton component that opens a custom file panel.
 * Based on the official BlockNote FileReplaceButton implementation.
 * @see https://github.com/TypeCellOS/BlockNote/blob/main/packages/react/src/components/FormattingToolbar/DefaultButtons/FileReplaceButton.tsx
 */
export const FileReplaceButton = () => {
	const dict = useDictionary();
	// biome-ignore lint/style/noNonNullAssertion: Components context is always available within BlockNote
	const Components = useComponentsContext()!;

	const editor = useBlockNoteEditor<
		BlockSchema,
		InlineContentSchema,
		StyleSchema
	>();

	const selectedBlocks = useSelectedBlocks(editor);

	// Memoize block selection to prevent unnecessary re-renders
	const block = useMemo(() => {
		if (!editor.isEditable) {
			return undefined;
		}

		if (selectedBlocks.length !== 1) {
			return undefined;
		}

		const selectedBlock = selectedBlocks[0];

		if (!selectedBlock) {
			return undefined;
		}

		if (
			!blockHasType(selectedBlock, editor, selectedBlock.type, {
				url: "string",
			})
		) {
			return undefined;
		}

		return selectedBlock;
	}, [editor, selectedBlocks]);

	if (block === undefined) {
		return null;
	}

	return (
		<Components.Generic.Popover.Root position={"bottom"}>
			<Components.Generic.Popover.Trigger>
				<Components.FormattingToolbar.Button
					className={"bn-button"}
					mainTooltip={
						dict.formatting_toolbar.file_replace.tooltip[block.type] ||
						dict.formatting_toolbar.file_replace.tooltip.file
					}
					label={
						dict.formatting_toolbar.file_replace.tooltip[block.type] ||
						dict.formatting_toolbar.file_replace.tooltip.file ||
						""
					}
					icon={<IconFileImport />}
				/>
			</Components.Generic.Popover.Trigger>
			<Components.Generic.Popover.Content
				className={"bn-popover-content bn-panel-popover"}
				variant={"panel-popover"}
			>
				{/* Custom file panel instead of default */}
				<CustomFilePanel
					props={{
						block: block,
					}}
				/>
			</Components.Generic.Popover.Content>
		</Components.Generic.Popover.Root>
	);
};
