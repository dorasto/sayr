import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@repo/ui/components/input-group";
import {
	IconBold,
	IconCheck,
	IconCode,
	IconForms,
	IconItalic,
	IconLink,
	IconStrikethrough,
	IconTrash,
	IconUnderline,
} from "@tabler/icons-react";
import type { BasicExtension } from "prosekit/basic";
import type { Editor } from "prosekit/core";
import type { LinkAttrs } from "prosekit/extensions/link";
import type { EditorState } from "prosekit/pm/state";
import { useEditor, useEditorDerivedValue } from "prosekit/react";
import { InlinePopover } from "prosekit/react/inline-popover";
import { useState } from "react";
import { useEditorMode } from "../editor-mode-context";
import { Button } from "./button";

function getInlineMenuItems(editor: Editor<BasicExtension>) {
	// Cast to access custom marks/commands not in BasicExtension typing
	const ed = editor as Editor<BasicExtension> & {
		commands: { toggleTemplatePlaceholder?: { canExec: () => boolean; (): void } };
		marks: { templatePlaceholder?: { isActive: () => boolean } };
	};

	return {
		bold: editor.commands.toggleBold
			? {
					isActive: editor.marks.bold.isActive(),
					canExec: editor.commands.toggleBold.canExec(),
					command: () => editor.commands.toggleBold(),
				}
			: undefined,
		italic: editor.commands.toggleItalic
			? {
					isActive: editor.marks.italic.isActive(),
					canExec: editor.commands.toggleItalic.canExec(),
					command: () => editor.commands.toggleItalic(),
				}
			: undefined,
		underline: editor.commands.toggleUnderline
			? {
					isActive: editor.marks.underline.isActive(),
					canExec: editor.commands.toggleUnderline.canExec(),
					command: () => editor.commands.toggleUnderline(),
				}
			: undefined,
		strike: editor.commands.toggleStrike
			? {
					isActive: editor.marks.strike.isActive(),
					canExec: editor.commands.toggleStrike.canExec(),
					command: () => editor.commands.toggleStrike(),
				}
			: undefined,
		code: editor.commands.toggleCode
			? {
					isActive: editor.marks.code.isActive(),
					canExec: editor.commands.toggleCode.canExec(),
					command: () => editor.commands.toggleCode(),
				}
			: undefined,
		link: editor.commands.addLink
			? {
					isActive: editor.marks.link.isActive(),
					canExec: editor.commands.addLink.canExec({ href: "" }),
					command: () => editor.commands.expandLink(),
					currentLink: getCurrentLink(editor.state) || "",
				}
			: undefined,
		templatePlaceholder: ed.commands.toggleTemplatePlaceholder
			? {
					isActive: ed.marks.templatePlaceholder?.isActive() ?? false,
					canExec: ed.commands.toggleTemplatePlaceholder.canExec(),
					command: () => ed.commands.toggleTemplatePlaceholder?.(),
				}
			: undefined,
	};
}

function getCurrentLink(state: EditorState): string | undefined {
	const { $from } = state.selection;
	const marks = $from.marksAcross($from);
	if (!marks) {
		return;
	}
	for (const mark of marks) {
		if (mark.type.name === "link") {
			return (mark.attrs as LinkAttrs).href;
		}
	}
}

export default function InlineMenu() {
	const editor = useEditor<BasicExtension>();
	const items = useEditorDerivedValue(getInlineMenuItems);
	const { isTemplateEditor } = useEditorMode();

	const [linkMenuOpen, setLinkMenuOpen] = useState(false);
	const toggleLinkMenuOpen = () => setLinkMenuOpen((open) => !open);

	const handleLinkUpdate = (href?: string) => {
		if (href) {
			editor.commands.addLink({ href });
		} else {
			editor.commands.removeLink();
		}

		setLinkMenuOpen(false);
		editor.focus();
	};

	return (
		<>
			<InlinePopover
				data-testid="inline-menu-main"
				className="z-10 box-border border bg-card shadow-lg [&:not([data-state])]:hidden relative flex min-w-32 space-x-1 overflow-auto whitespace-nowrap rounded-md p-1"
				onOpenChange={(open) => {
					if (!open) {
						setLinkMenuOpen(false);
					}
				}}
			>
				{items.bold && (
					<Button
						pressed={items.bold.isActive}
						disabled={!items.bold.canExec}
						onClick={items.bold.command}
						tooltip="Bold"
						variant={items.bold.isActive ? "primary" : "ghost"}
					>
						<IconBold className="size-5" />
					</Button>
				)}
				{items.italic && (
					<Button
						pressed={items.italic.isActive}
						disabled={!items.italic.canExec}
						onClick={items.italic.command}
						tooltip="Italic"
						variant={items.italic.isActive ? "primary" : "ghost"}
					>
						<IconItalic className="size-5" />
					</Button>
				)}
				{items.underline && (
					<Button
						pressed={items.underline.isActive}
						disabled={!items.underline.canExec}
						onClick={items.underline.command}
						tooltip="Underline"
						variant={items.underline.isActive ? "primary" : "ghost"}
					>
						<IconUnderline className="size-5 h-5!" />
					</Button>
				)}
				{items.strike && (
					<Button
						pressed={items.strike.isActive}
						disabled={!items.strike.canExec}
						onClick={items.strike.command}
						tooltip="Strikethrough"
						variant={items.strike.isActive ? "primary" : "ghost"}
					>
						<IconStrikethrough className="size-5" />
					</Button>
				)}
				{items.code && (
					<Button
						pressed={items.code.isActive}
						disabled={!items.code.canExec}
						onClick={items.code.command}
						tooltip="Code"
						variant={items.code.isActive ? "primary" : "ghost"}
					>
						<IconCode className="size-5" />
					</Button>
				)}
				{items.link && items.link.canExec && (
					<Button
						pressed={items.link.isActive}
						onClick={() => {
							items.link?.command?.();
							toggleLinkMenuOpen();
						}}
						tooltip="Link"
						variant={items.link.isActive ? "primary" : "ghost"}
					>
						<IconLink className="size-5" />
					</Button>
				)}
				{isTemplateEditor && items.templatePlaceholder && (
					<>
						<div className="mx-0.5 h-5 w-px bg-border self-center" />
						<Button
							pressed={items.templatePlaceholder.isActive}
							disabled={!items.templatePlaceholder.canExec}
							onClick={items.templatePlaceholder.command}
							tooltip="Placeholder"
							variant={items.templatePlaceholder.isActive ? "primary" : "ghost"}
						>
							<IconForms className="size-5" />
						</Button>
					</>
				)}
			</InlinePopover>

			{items.link && (
				<InlinePopover
					placement="bottom"
					defaultOpen={false}
					open={linkMenuOpen}
					onOpenChange={setLinkMenuOpen}
					data-testid="inline-menu-link"
					className="z-10 box-border border bg-popover shadow-lg [&:not([data-state])]:hidden relative flex flex-col w-fit max-w-fit overflow-hidden rounded-lg p-0"
				>
					{linkMenuOpen && (
						<form
							className="min-w-full w-full"
							onSubmit={(event) => {
								event.preventDefault();
								const target = event.target as HTMLFormElement | null;
								const href = target?.querySelector("input")?.value?.trim();
								handleLinkUpdate(href);
							}}
						>
							<InputGroup className="rounded-lg text-foreground w-full">
								<InputGroupInput defaultValue={items.link.currentLink} placeholder="Paste the link..." />
								<InputGroupAddon align="inline-end">
									<InputGroupButton aria-label="Update link" title="Update link" size="icon-xs" type="submit">
										<IconCheck className="size-4" />
									</InputGroupButton>
									{items.link.isActive && (
										<InputGroupButton
											aria-label="Remove link"
											title="Remove link"
											size="icon-xs"
											type="button"
											onClick={() => handleLinkUpdate()}
										>
											<IconTrash className="size-4" />
										</InputGroupButton>
									)}
								</InputGroupAddon>
							</InputGroup>
						</form>
					)}
				</InlinePopover>
			)}
		</>
	);
}
