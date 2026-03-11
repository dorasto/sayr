import "prosekit/basic/style.css";
import "prosekit/basic/typography.css";

import { createEditor, type NodeJSON } from "prosekit/core";
import type { Uploader } from "prosekit/extensions/file";
import { ProseKit, useDocChange } from "prosekit/react";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useMentionUsers } from "@/hooks/useMentionUsers";
import { resolveUsersByIds } from "@/lib/fetches/mention";
import { EditorModeContext } from "./editor-mode-context";
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
import type { schema } from "@repo/database";

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
  /** Users for MentionView chip rendering (readonly editors). Merged with search cache. */
  mentionViewUsers?: schema.UserSummary[];
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
  mentionViewUsers,
}: EditorProps) {
  // Use the mention hook — it reads mentionContext from the global store,
  // fetches org members from the backend, and supports async search.
  // Falls back to empty when no mentionContext is set.
  const mention = useMentionUsers();

  // Determine which users to show
  const mentionUsers = mention.users;
  // Merge search-system users with any explicitly provided users (for readonly editors).
  // Deduplicate by user ID so MentionView can always resolve mention chips.
  const allUsersForView = useMemo(() => {
    if (!mentionViewUsers?.length) return mention.allSeenUsers;
    const merged = new Map<string, schema.UserSummary>();
    for (const u of mention.allSeenUsers) merged.set(u.id, u);
    for (const u of mentionViewUsers) {
      if (!merged.has(u.id)) merged.set(u.id, u);
    }
    return Array.from(merged.values());
  }, [mention.allSeenUsers, mentionViewUsers]);

  // Extract mention user IDs from the document content and resolve any that are missing.
  // This ensures MentionView can always render chips, regardless of context (inbox, org, etc.).
  const mentionedUserIds = useMemo(() => extractMentionUserIds(defaultContent), [defaultContent]);

  const missingUserIds = useMemo(() => {
    if (!mentionedUserIds.length) return [];
    const knownIds = new Set(allUsersForView.map((u) => u.id));
    return mentionedUserIds.filter((id) => !knownIds.has(id));
  }, [mentionedUserIds, allUsersForView]);

  const { data: resolvedUsers } = useQuery<schema.UserSummary[]>({
    queryKey: ["resolveUsers", missingUserIds],
    queryFn: () => resolveUsersByIds(missingUserIds),
    enabled: missingUserIds.length > 0,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });

  // Final user list: merge allUsersForView with any resolved users
  const finalUsersForView = useMemo(() => {
    if (!resolvedUsers?.length) return allUsersForView;
    const merged = new Map<string, schema.UserSummary>();
    for (const u of allUsersForView) merged.set(u.id, u);
    for (const u of resolvedUsers) {
      if (!merged.has(u.id)) merged.set(u.id, u);
    }
    return Array.from(merged.values());
  }, [allUsersForView, resolvedUsers]);

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

    // -------------------------------
    // 📋 PASTE HANDLER
    // -------------------------------
    const handlePaste = async (event: ClipboardEvent) => {
      // console.group("📋 Paste event detected!");

      if (!event.clipboardData) {
        // console.log("⚠️ No clipboardData found on paste event.");
        // console.groupEnd();
        return;
      }

      const items = Array.from(event.clipboardData.items);
      const mediaItems = items.filter(
        (i) => i.type.startsWith("image/") || i.type.startsWith("video/"),
      );

      if (mediaItems.length === 0) {
        // console.log("😐 No media found in clipboard.");
        // console.groupEnd();
        return;
      }

      event.preventDefault();
      // console.group(`🧩 Processing ${mediaItems.length} media item(s)`);

      for (const item of mediaItems) {
        // console.log("➡️ Item type:", item.type);
        const file = item.getAsFile();
        if (!file) {
          // console.log("🚫 Skipped — clipboard item not a File.");
          continue;
        }

        const blobUrl = URL.createObjectURL(file);
        // console.log("🪣 Blob URL created:", blobUrl);

        const type = file.type.startsWith("video/") ? "video" : "image";

        if (type === "video") {
          // console.log("🎞️ Inserting video node...");
          const { state, view } = editor;
          const videoType = state.schema.nodes.video;
          if (!videoType) {
            // console.warn("⚠️ No 'video' node type found in schema.");
            continue;
          }

          try {
            const node = videoType.create({ src: blobUrl });
            const tr = state.tr.replaceSelectionWith(node).scrollIntoView();
            view.dispatch(tr);
            // console.log("✅ Video inserted successfully.");
          } catch (err) {
            // console.error("❌ Video insert error:", err);
          }
        } else {
          // console.log("🖼️ Inserting image node...");
          try {
            // @ts-expect-error ProseKit typing gap
            editor.commands?.insertImage?.({ src: blobUrl });
            // console.log("✅ Image inserted successfully.");
          } catch (err) {
            // console.error("❌ Image insert error:", err);
          }
        }
      }

      // console.groupEnd();
      // console.log("🎉 Paste handler done.");
      // console.groupEnd();
    };
    // -------------------------------
    // 📌 Attach listeners
    // -------------------------------
    view.dom.addEventListener("paste", handlePaste, { signal });
    // console.log("✅ Paste listener attached");
    // -------------------------------
    // 🧹 Cleanup
    // -------------------------------
    return () => {
      abort.abort();
      // console.log("🧹 Paste listener removed");
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
  const editorMode = useMemo(
    () => ({ isTemplateEditor, hasTemplate }),
    [isTemplateEditor, hasTemplate],
  );
  return (
    <EditorModeContext.Provider value={editorMode}>
    <ProseKit editor={editor}>
      <div className={className}>
        {/* <div className="z-10 box-border border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
					<Toolbar />
				</div> */}
        <div
          ref={editor.mount}
          className={cn(
            'ProseMirror box-border min-h-full px-12 py-0! outline-none outline-0 [&_span[data-mention="tag"]]:text-violet-500',
            (readonly || hideBlockHandle) && "px-0",
          )}
          {...(isTemplateEditor ? { "data-template-editor": "true" } : {})}
          {...(hasTemplate ? { "data-has-template": "true" } : {})}
        ></div>
        {!readonly && (
          <>
            <InlineMenu />
			{!hasTemplate ? <SlashMenu /> : <SlashMenuTemplate />}
            <UserMenu
              users={mentionUsers}
              loading={mention.loading}
              onQueryChange={mention.setSearchQuery}
            />
            <CategoryMenu categories={categories || []} />
            <TaskMenu tasks={tasks || []} />
          </>
        )}
        <CodeBlockView />
        <ImageView />
        <MentionView
          users={finalUsersForView}
          categories={categories || []}
          tasks={tasks || []}
        />
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
