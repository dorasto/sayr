import "prosekit/basic/style.css";
import "prosekit/basic/typography.css";

import type { schema } from "@repo/database";
import { createEditor, type NodeJSON } from "prosekit/core";
import type { Uploader } from "prosekit/extensions/file";
import { ProseKit, useDocChange } from "prosekit/react";
import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { defineExtension } from "./extensions/index";
import BlockHandle from "./ui/block-handle";
import CodeBlockView from "./ui/code-block-view";
import DropIndicator from "./ui/drop-indicator";
import ImageView from "./ui/image-view";
import InlineMenu from "./ui/inline-menu";
import MentionView from "./ui/mention-view";
import SlashMenu from "./ui/slash-menu";
import TableHandle from "./ui/table-handle";
import Toolbar from "./ui/toolbar";
import UserMenu from "./ui/user-menu";
import CategoryMenu from "./ui/category-menu";
import TaskMenu from "./ui/task-menu";
import SlashMenuTemplate from "./ui/slash-menu-template";

export interface EditorProps {
	readonly?: boolean;
	placeholder?: string;
	defaultContent?: NodeJSON;
	uploader?: Uploader<string>;
	className?: string;
	onChange?: (doc: NodeJSON) => void; // ✅ New prop
	users?: schema.userType[];
	categories?: schema.categoryType[];
	tasks?: schema.TaskWithLabels[];
	submit?: () => void;
	hasTemplate?: boolean
}

export default function Editor({
	readonly = false,
	placeholder,
	defaultContent,
	className,
	onChange,
	users = [],
	categories = [],
	tasks = [],
	submit,
	hasTemplate = false
}: EditorProps) {
	const editor = useMemo(() => {
		const extension = defineExtension({ readonly, placeholder });
		return createEditor({ extension, defaultContent });
	}, [readonly, placeholder, defaultContent]);
	useEffect(() => {
		if (readonly) {
			return;
		}

		const view = editor.view;
		if (!view) return;

		const abort = new AbortController();
		const { signal } = abort;

		// -------------------------------
		// 📋 PASTE HANDLER
		// -------------------------------
		const handlePaste = async (event: ClipboardEvent) => {
			console.group("📋 Paste event detected!");

			if (!event.clipboardData) {
				console.log("⚠️ No clipboardData found on paste event.");
				console.groupEnd();
				return;
			}

			const items = Array.from(event.clipboardData.items);
			const mediaItems = items.filter(
				(i) => i.type.startsWith("image/") || i.type.startsWith("video/"),
			);

			if (mediaItems.length === 0) {
				console.log("😐 No media found in clipboard.");
				console.groupEnd();
				return;
			}

			event.preventDefault();
			console.group(`🧩 Processing ${mediaItems.length} media item(s)`);

			for (const item of mediaItems) {
				console.log("➡️ Item type:", item.type);
				const file = item.getAsFile();
				if (!file) {
					console.log("🚫 Skipped — clipboard item not a File.");
					continue;
				}

				const blobUrl = URL.createObjectURL(file);
				console.log("🪣 Blob URL created:", blobUrl);

				const type = file.type.startsWith("video/") ? "video" : "image";

				if (type === "video") {
					console.log("🎞️ Inserting video node...");
					const { state, view } = editor;
					const videoType = state.schema.nodes.video;
					if (!videoType) {
						console.warn("⚠️ No 'video' node type found in schema.");
						continue;
					}

					try {
						const node = videoType.create({ src: blobUrl });
						const tr = state.tr.replaceSelectionWith(node).scrollIntoView();
						view.dispatch(tr);
						console.log("✅ Video inserted successfully.");
					} catch (err) {
						console.error("❌ Video insert error:", err);
					}
				} else {
					console.log("🖼️ Inserting image node...");
					try {
						// @ts-expect-error ProseKit typing gap
						editor.commands?.insertImage?.({ src: blobUrl });
						console.log("✅ Image inserted successfully.");
					} catch (err) {
						console.error("❌ Image insert error:", err);
					}
				}
			}

			console.groupEnd();
			console.log("🎉 Paste handler done.");
			console.groupEnd();
		};
		// -------------------------------
		// 📌 Attach listeners
		// -------------------------------
		view.dom.addEventListener("paste", handlePaste, { signal });
		console.log("✅ Paste listener attached");
		// -------------------------------
		// 🧹 Cleanup
		// -------------------------------
		return () => {
			abort.abort();
			console.log("🧹 Paste listener removed");
		};
	}, [editor, readonly]);
	useEffect(() => {
		const view = editor?.view;
		if (!view) return;
		const handleCtrlEnter = (event: KeyboardEvent) => {
			// detect Enter + Ctrl (Windows/Linux) or Cmd (Mac)
			if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
				// ✋ stop the default editor behavior entirely
				event.preventDefault(); // stops default line break
				event.stopPropagation(); // blocks ProseKit/ProseMirror keymaps
				event.stopImmediatePropagation?.(); // fully block bubbling
				submit?.();
			}
		};
		// Attach listener before ProseKit’s handlers get a chance
		// Use capture phase for reliability
		view.dom.addEventListener("keydown", handleCtrlEnter, true);
		return () => {
			view.dom.removeEventListener("keydown", handleCtrlEnter, true);
		};
	}, [editor, submit]);
	useDocChange(
		() => {
			const json = editor.getDocJSON();
			if (onChange) onChange(json); // ✅ send data to parent
		},
		{ editor },
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
						readonly && "px-0",
					)}
				></div>
				{!readonly && (
					<>
						<InlineMenu />
						{!hasTemplate ? (
							<SlashMenu />
						) : (<SlashMenuTemplate />)}
						<UserMenu users={users || []} />
						<CategoryMenu categories={categories || []} />
						<TaskMenu tasks={tasks || []} />
					</>
				)}
				<CodeBlockView />
				<ImageView />
				<MentionView
					users={users || []}
					categories={categories || []}
					tasks={tasks || []}
				/>
				{!readonly && (
					<>
						{!hasTemplate && (
							<BlockHandle />
						)}
						<TableHandle />
						<DropIndicator />
					</>
				)}
			</div>
		</ProseKit>
	);
}
