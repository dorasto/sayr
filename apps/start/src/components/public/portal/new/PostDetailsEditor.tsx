import type { schema } from "@repo/database";
import { Skeleton } from "@repo/ui/components/skeleton";
import type { NodeJSON } from "prosekit/core";
import { lazy, Suspense } from "react";
import { PostEditorToolbar } from "@/components/public/portal/new/PostEditorToolbar";
import { isDocJson } from "@/lib/portal/new-post";

const Editor = lazy(() => import("@/components/prosekit/editor"));

interface PostDetailsEditorProps {
	/** The stored draft has been read; until then a skeleton stands in (the editor cannot be rebuilt cheaply). */
	ready: boolean;
	/** Bumped to rebuild the editor with fresh `initialDoc` content. */
	editorKey: number;
	/** Content the editor opens with. */
	initialDoc: NodeJSON | undefined;
	/** The content came from a template, so the editor shows its template affordances. */
	hasTemplate: boolean;
	categories: schema.categoryType[];
	onChange: (doc: NodeJSON) => void;
	/** The editor's submit shortcut. */
	onSubmit: () => void;
}

/** The new post form's "Details" rich-text editor, with its minimal toolbar. */
export function PostDetailsEditor({
	ready,
	editorKey,
	initialDoc,
	hasTemplate,
	categories,
	onChange,
	onSubmit,
}: PostDetailsEditorProps) {
	return (
		<div>
			<div className="mb-2 flex items-center gap-2 font-semibold text-sm">
				Details <span className="font-normal text-muted-foreground">Optional, but it helps</span>
			</div>
			<div className="overflow-hidden rounded-lg border border-input bg-background focus-within:border-primary/60">
				{ready ? (
					<Suspense fallback={<Skeleton className="h-48 rounded-none" />}>
						<Editor
							key={editorKey}
							firstLinePlaceholder="What are you trying to do, and what gets in the way? For a bug, what you did and what you expected."
							className="bg-transparent text-[15px] leading-6 [&_.ProseMirror]:min-h-40 [&_.ProseMirror]:px-4 [&_.ProseMirror]:py-3.5!"
							onChange={onChange}
							submit={onSubmit}
							categories={categories}
							defaultContent={initialDoc && isDocJson(initialDoc) ? initialDoc : undefined}
							hasTemplate={hasTemplate}
							hideBlockHandle
							toolbar={<PostEditorToolbar />}
						/>
					</Suspense>
				) : (
					<Skeleton className="h-48 rounded-none" />
				)}
			</div>
		</div>
	);
}
