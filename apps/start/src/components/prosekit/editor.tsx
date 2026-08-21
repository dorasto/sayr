import "prosekit/basic/style.css";
import "prosekit/basic/typography.css";

import type { schema } from "@repo/database";
import { useQuery } from "@tanstack/react-query";
import { createEditor, type NodeJSON } from "prosekit/core";
import type { Uploader } from "prosekit/extensions/file";
import { ProseKit, useDocChange } from "prosekit/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMentionTasks } from "@/hooks/useMentionTasks";
import { useMentionUsers } from "@/hooks/useMentionUsers";
import { resolveUsersByIds } from "@/lib/fetches/mention";
import { cn } from "@/lib/utils";
import { EditorModeContext } from "./editor-mode-context";
import { defineExtension } from "./extensions/index";
import BlockHandle from "./ui/block-handle";
import CategoryMenu from "./ui/category-menu";
import CodeBlockView from "./ui/code-block-view";
import DropIndicator from "./ui/drop-indicator";
import ImageView from "./ui/image-view";
import InlineMenu from "./ui/inline-menu";
import MentionView from "./ui/mention-view";
import SlashMenu from "./ui/slash-menu";
import SlashMenuTemplate from "./ui/slash-menu-template";
import TableHandle from "./ui/table-handle";
import TaskMenu from "./ui/task-menu";
import UserMenu from "./ui/user-menu";

/** Recursively extract user IDs from mention nodes in a ProseMirror document JSON. */
function extractMentionUserIds(node: NodeJSON | undefined): string[] {
	if (!node) return [];
	const ids: string[] = [];
	if (node.type === "mention" && node.attrs?.kind === "user" && node.attrs?.id) {
		ids.push(String(node.attrs.id));
	}
	if (node.content) {
		for (const child of node.content) {
			ids.push(...extractMentionUserIds(child));
		}
	}
	return ids;
}

export interface EditorProps {
	readonly?: boolean;
	placeholder?: string;
	firstLinePlaceholder?: string;
	defaultContent?: NodeJSON;
	uploader?: Uploader<string>;
	className?: string;
	onChange?: (doc: NodeJSON) => void;
	categories?: schema.categoryType[];
	tasks?: schema.TaskWithLabels[];
	submit?: () => void;
	hasTemplate?: boolean;
	hideBlockHandle?: boolean;
	/** When true, shows the Placeholder slash menu item for template authoring. */
	isTemplateEditor?: boolean;
	/** Fires whenever a slash/mention/category/task autocomplete popover opens or closes. */
	onMenuOpenChange?: (open: boolean) => void;
	/** Fires when the editor's content DOM loses focus. */
	onBlur?: () => void;
}

export default function Editor({
	readonly = false,
	placeholder,
	firstLinePlaceholder,
	defaultContent,
	className,
	onChange,
	categories = [],
	tasks = [],
	submit,
	hasTemplate = false,
	hideBlockHandle = false,
	isTemplateEditor = false,
	onMenuOpenChange,
	onBlur,
}: EditorProps) {
	// Use the mention hook — it reads mentionContext from the global store,
	// fetches users from the backend, and supports async search.
	// Falls back to empty when no mentionContext is set.
	const mention = useMentionUsers();
	const mentionTasks = useMentionTasks();

	// Extract mention user IDs from the document content and resolve any that are missing.
	// This ensures MentionView can always render chips, regardless of context (inbox, org, etc.).
	const mentionedUserIds = useMemo(() => extractMentionUserIds(defaultContent), [defaultContent]);

	const missingUserIds = useMemo(() => {
		if (!mentionedUserIds.length) return [];
		const knownIds = new Set(mention.allSeenUsers.map((u) => u.id));
		return mentionedUserIds.filter((id) => !knownIds.has(id));
	}, [mentionedUserIds, mention.allSeenUsers]);

	const { data: resolvedUsers } = useQuery<schema.UserSummary[]>({
		queryKey: ["resolveUsers", missingUserIds],
		queryFn: () => resolveUsersByIds(missingUserIds),
		enabled: missingUserIds.length > 0,
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 30,
	});

	// Final user list: merge mention.allSeenUsers with any resolved users
	const finalUsersForView = useMemo(() => {
		if (!resolvedUsers?.length) return mention.allSeenUsers;
		const merged = new Map<string, schema.UserSummary>();
		for (const u of mention.allSeenUsers) merged.set(u.id, u);
		for (const u of resolvedUsers) {
			if (!merged.has(u.id)) merged.set(u.id, u);
		}
		return Array.from(merged.values());
	}, [mention.allSeenUsers, resolvedUsers]);

	const editor = useMemo(() => {
		const extension = defineExtension({ readonly, placeholder, firstLinePlaceholder, hasTemplate });
		return createEditor({ extension, defaultContent });
	}, [readonly, placeholder, firstLinePlaceholder, hasTemplate, defaultContent]);
	useEffect(() => {
		if (readonly) {
			return;
		}

		const view = editor.view;
		if (!view) return;

		const abort = new AbortController();
		const { signal } = abort;

		const handlePaste = async (event: ClipboardEvent) => {
			if (!event.clipboardData) {
				return;
			}

			const items = Array.from(event.clipboardData.items);
			const mediaItems = items.filter((i) => i.type.startsWith("image/") || i.type.startsWith("video/"));

			if (mediaItems.length === 0) {
				return;
			}

			event.preventDefault();

			for (const item of mediaItems) {
				const file = item.getAsFile();
				if (!file) {
					continue;
				}

				const blobUrl = URL.createObjectURL(file);

				const type = file.type.startsWith("video/") ? "video" : "image";

				if (type === "video") {
					const { state, view } = editor;
					const videoType = state.schema.nodes.video;
					if (!videoType) {
						continue;
					}

					try {
						const node = videoType.create({ src: blobUrl });
						const tr = state.tr.replaceSelectionWith(node).scrollIntoView();
						view.dispatch(tr);
					} catch (err) {
						// console.error("❌ Video insert error:", err);
					}
				} else {
					try {
						// @ts-expect-error ProseKit typing gap
						editor.commands?.insertImage?.({ src: blobUrl });
					} catch (err) {
						// console.error("❌ Image insert error:", err);
					}
				}
			}
		};
		view.dom.addEventListener("paste", handlePaste, { signal });
		return () => {
			abort.abort();
		};
	}, [editor, readonly]);
	useEffect(() => {
		const view = editor?.view;
		if (!view) return;
		const handleCtrlEnter = (event: KeyboardEvent) => {
			if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
				event.preventDefault();
				event.stopPropagation();
				event.stopImmediatePropagation?.();
				submit?.();
			}
		};
		view.dom.addEventListener("keydown", handleCtrlEnter, true);
		return () => {
			view.dom.removeEventListener("keydown", handleCtrlEnter, true);
		};
	}, [editor, submit]);
	useEffect(() => {
		const view = editor?.view;
		if (!view || !onBlur) return;
		view.dom.addEventListener("blur", onBlur);
		return () => {
			view.dom.removeEventListener("blur", onBlur);
		};
	}, [editor, onBlur]);
	useDocChange(
		() => {
			const json = editor.getDocJSON();
			if (onChange) onChange(json);
		},
		{ editor }
	);

	// Track whether a slash/mention/category/task autocomplete popover is currently open, so
	// consumers (e.g. autosave) can pause while the user is mid-selection instead of persisting
	// an in-progress trigger like "/tab" or "@jo".
	const [openMenus, setOpenMenus] = useState<Set<string>>(() => new Set());
	const handleMenuOpenChange = useCallback((key: string, open: boolean) => {
		setOpenMenus((prev) => {
			if (prev.has(key) === open) return prev;
			const next = new Set(prev);
			if (open) next.add(key);
			else next.delete(key);
			return next;
		});
	}, []);

	useEffect(() => {
		onMenuOpenChange?.(openMenus.size > 0);
	}, [openMenus, onMenuOpenChange]);
	const editorMode = useMemo(() => ({ isTemplateEditor, hasTemplate }), [isTemplateEditor, hasTemplate]);
	return (
		<EditorModeContext.Provider value={editorMode}>
			<ProseKit editor={editor}>
				<div className={className}>
					<div
						ref={editor.mount}
						className={cn(
							'ProseMirror box-border min-h-full px-12 py-0! outline-none outline-0 [&_span[data-mention="tag"]]:text-violet-500',
							(readonly || hideBlockHandle) && "px-0"
						)}
						{...(isTemplateEditor ? { "data-template-editor": "true" } : {})}
						{...(hasTemplate ? { "data-has-template": "true" } : {})}
					></div>
					{!readonly && (
						<>
							<InlineMenu />
							{!hasTemplate ? (
								<SlashMenu onOpenChange={(open) => handleMenuOpenChange("slash", open)} />
							) : (
								<SlashMenuTemplate onOpenChange={(open) => handleMenuOpenChange("slash", open)} />
							)}
							<UserMenu
								users={mention.users}
								loading={mention.loading}
								onQueryChange={mention.setSearchQuery}
								onOpenChange={(open) => handleMenuOpenChange("mention", open)}
							/>
							<CategoryMenu
								categories={categories || []}
								onOpenChange={(open) => handleMenuOpenChange("category", open)}
							/>
							<TaskMenu
								tasks={mentionTasks.tasks}
								loading={mentionTasks.loading}
								onQueryChange={mentionTasks.setSearchQuery}
								onOpenChange={(open) => handleMenuOpenChange("task", open)}
							/>
						</>
					)}
					<CodeBlockView />
					<ImageView />
					<MentionView users={finalUsersForView} categories={categories || []} tasks={tasks || []} />
					{!readonly && (
						<>
							{!hasTemplate && !hideBlockHandle && <BlockHandle />}
							<TableHandle />
							{!hideBlockHandle && <DropIndicator />}
						</>
					)}
				</div>
			</ProseKit>
		</EditorModeContext.Provider>
	);
}
