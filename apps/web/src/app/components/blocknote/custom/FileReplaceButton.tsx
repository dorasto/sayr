import type { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { useBlockNoteEditor, useComponentsContext, useDictionary, useSelectedBlocks } from "@blocknote/react";
import { IconFileImport } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { CustomFilePanel } from "./CustomFilePanel";

export const FileReplaceButton = () => {
	const dict = useDictionary();
	// biome-ignore lint/style/noNonNullAssertion: <any>
	const Components = useComponentsContext()!;

	const editor = useBlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>();

	const selectedBlocks = useSelectedBlocks(editor);

	const [isOpen, setIsOpen] = useState<boolean>(false);

	useEffect(() => {
		setIsOpen(false);
	}, []);

	const block = selectedBlocks.length === 1 ? selectedBlocks[0] : undefined;

	if (block === undefined || !editor.isEditable) {
		return null;
	}

	return (
		<Components.Generic.Popover.Root opened={isOpen} position={"bottom"}>
			<Components.Generic.Popover.Trigger>
				<Components.FormattingToolbar.Button
					className={"bn-button"}
					onClick={() => setIsOpen(!isOpen)}
					isSelected={isOpen}
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
				{/* Replaces default file panel with our Uppy one. */}
				<CustomFilePanel
					props={{
						block: block,
					}}
				/>
			</Components.Generic.Popover.Content>
		</Components.Generic.Popover.Root>
	);
};
