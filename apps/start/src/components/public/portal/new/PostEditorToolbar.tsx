import { cn } from "@repo/ui/lib/utils";
import { IconBold, IconCode, IconList, IconPhoto } from "@tabler/icons-react";
import type { BasicExtension } from "prosekit/basic";
import type { Editor } from "prosekit/core";
import type { ImageExtension } from "prosekit/extensions/image";
import type { LinkAttrs } from "prosekit/extensions/link";
import { useEditor, useEditorDerivedValue } from "prosekit/react";
import { handleMediaUpload } from "@/components/prosekit/utils/uploadMedia";
import { LinkButton } from "@/components/public/portal/new/LinkButton";
import { ToolbarButton } from "@/components/public/portal/new/ToolbarButton";

function getCurrentLink(editor: Editor<BasicExtension>): string {
	const { $from } = editor.state.selection;
	for (const mark of $from.marksAcross($from) ?? []) {
		if (mark.type.name === "link") return (mark.attrs as LinkAttrs).href;
	}
	return "";
}

function getItems(editor: Editor<BasicExtension>) {
	return {
		bold: {
			active: editor.marks.bold.isActive(),
			enabled: editor.commands.toggleBold.canExec(),
			run: () => editor.commands.toggleBold(),
		},
		list: {
			active: editor.nodes.list.isActive({ kind: "bullet" }),
			enabled: editor.commands.toggleList.canExec({ kind: "bullet" }),
			run: () => editor.commands.toggleList({ kind: "bullet" }),
		},
		code: {
			active: editor.marks.code.isActive(),
			enabled: editor.commands.toggleCode.canExec(),
			run: () => editor.commands.toggleCode(),
		},
		link: {
			active: editor.marks.link.isActive(),
			enabled: editor.commands.addLink.canExec({ href: "" }),
			href: getCurrentLink(editor),
		},
	};
}

interface PostEditorToolbarProps {
	className?: string;
}

/**
 * The new post form's minimal editor toolbar: bold, bullet list, code, link and image. Rendered through the shared
 * `Editor`'s `toolbar` slot so it sits inside the ProseKit context. Images become `blob:` URLs here and are uploaded by
 * `processUploads` on submit, exactly like pasted ones.
 */
export function PostEditorToolbar({ className }: PostEditorToolbarProps) {
	const items = useEditorDerivedValue(getItems);
	const imageEditor = useEditor<ImageExtension>();

	return (
		<div className={cn("flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5", className)}>
			<ToolbarButton
				label="Bold"
				holdFocus
				pressed={items.bold.active}
				disabled={!items.bold.enabled}
				onClick={items.bold.run}
			>
				<IconBold aria-hidden className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				label="Bulleted list"
				holdFocus
				pressed={items.list.active}
				disabled={!items.list.enabled}
				onClick={items.list.run}
			>
				<IconList aria-hidden className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				label="Code"
				holdFocus
				pressed={items.code.active}
				disabled={!items.code.enabled}
				onClick={items.code.run}
			>
				<IconCode aria-hidden className="size-4" />
			</ToolbarButton>
			<LinkButton active={items.link.active} enabled={items.link.enabled} href={items.link.href} />
			<ToolbarButton label="Add an image" holdFocus onClick={() => void handleMediaUpload(imageEditor, "image")}>
				<IconPhoto aria-hidden className="size-4" />
			</ToolbarButton>
		</div>
	);
}
