import "prosekit/basic/style.css";
import "prosekit/basic/typography.css";

import type { schema } from "@repo/database";
import { createEditor, type NodeJSON } from "prosekit/core";
import type { Uploader } from "prosekit/extensions/file";
import { ProseKit, useDocChange } from "prosekit/react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { defineExtension } from "./extensions/index";
import { tags as defaultTags } from "./sample/tag-data";
import BlockHandle from "./ui/block-handle";
import CodeBlockView from "./ui/code-block-view";
import DropIndicator from "./ui/drop-indicator";
import ImageView from "./ui/image-view";
import InlineMenu from "./ui/inline-menu";
import MentionView from "./ui/mention-view";
import SlashMenu from "./ui/slash-menu";
import TableHandle from "./ui/table-handle";
import TagMenu from "./ui/tag-menu";
import Toolbar from "./ui/toolbar";
import UserMenu from "./ui/user-menu";

export interface EditorProps {
	readonly?: boolean;
	placeholder?: string;
	defaultContent?: NodeJSON;
	uploader?: Uploader<string>;
	users?: schema.userType[];
	className?: string;
	onChange?: (doc: NodeJSON) => void; // ✅ New prop
}

export default function Editor({
	readonly = false,
	placeholder,
	defaultContent,
	users = [],
	className,
	onChange,
}: EditorProps) {
	const editor = useMemo(() => {
		const extension = defineExtension({ readonly, placeholder });
		return createEditor({ extension, defaultContent });
	}, [readonly, placeholder, defaultContent]);
	useDocChange(
		() => {
			const json = editor.getDocJSON();
			if (onChange) onChange(json); // ✅ send data to parent
		},
		{ editor }
	);
	return (
		<ProseKit editor={editor}>
			<div className={className}>
				{/* <div className="z-10 box-border border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
					<Toolbar />
				</div> */}
				<div
					ref={editor.mount}
					className={cn(
						'ProseMirror box-border min-h-full px-12 py-0! outline-none outline-0 [&_span[data-mention="tag"]]:text-violet-500',
						readonly && "px-0"
					)}
				></div>
				{!readonly && (
					<>
						<InlineMenu />
						<SlashMenu />
						<UserMenu users={users || []} />
						<TagMenu tags={defaultTags} />
					</>
				)}
				<CodeBlockView />
				<ImageView />
				<MentionView users={users || []} />
				{!readonly && (
					<>
						<BlockHandle />
						<TableHandle />
						<DropIndicator />
					</>
				)}
			</div>
		</ProseKit>
	);
}
