import "prosekit/basic/style.css";
import "prosekit/basic/typography.css";

import { createEditor, type NodeJSON } from "prosekit/core";
import type { Uploader } from "prosekit/extensions/file";
import { ProseKit } from "prosekit/react";
import { useMemo } from "react";

import { defineExtension } from "./extension";
import { sampleDocFull } from "./sample/sample-doc-full";
import { sampleUploader } from "./sample/sample-uploader";
import { tags as defaultTags } from "./sample/tag-data";
import { users as defaultUsers } from "./sample/user-data";
import BlockHandle from "./ui/block-handle";
import CodeBlockView from "./ui/code-block-view";
import DropIndicator from "./ui/drop-indicator";
import ImageUploadPopover from "./ui/image-upload-popover";
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
	users?: Array<{ id: number; name: string; image?: string }>;
	tags?: Array<{ id: number; label: string }>;
	className?: string;
}

export default function Editor({
	readonly = false,
	placeholder,
	defaultContent = sampleDocFull,
	uploader = sampleUploader,
	users = defaultUsers,
	tags = defaultTags,
	className,
}: EditorProps) {
	const editor = useMemo(() => {
		const extension = defineExtension({ readonly, placeholder });
		return createEditor({ extension, defaultContent });
	}, [readonly, placeholder, defaultContent]);

	return (
		<ProseKit editor={editor}>
			<div className={className}>
				{/* <div className="z-10 box-border border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
					<Toolbar />
				</div> */}
				<div
					ref={editor.mount}
					className='ProseMirror box-border min-h-full px-[max(4rem,_calc(50%-20rem))] py-8 outline-none outline-0 [&_span[data-mention="tag"]]:text-violet-500'
				></div>
				<InlineMenu />
				<SlashMenu />
				<UserMenu users={users} />
				<TagMenu tags={tags} />
				<CodeBlockView />
				<ImageView />
				<MentionView />
				<BlockHandle />
				<TableHandle />
				<DropIndicator />
				<ImageUploadPopover
					uploader={uploader}
					tooltip="Upload Image"
					disabled={false}
				>
					<div className="i-lucide-image size-5" />
				</ImageUploadPopover>
			</div>
		</ProseKit>
	);
}
