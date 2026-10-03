import type { schema } from "@repo/database";
import { Skeleton } from "@repo/ui/components/skeleton";
import type { NodeJSON } from "prosekit/core";
import { lazy, Suspense } from "react";
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

/**
 * The new post form's details editor, as in the admin task creator: no box of its own, grows with its content and
 * scrolls with the page. Formatting and images come from the editor's slash and inline menus.
 */
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
		<div className="min-h-32">
			{ready ? (
				<Suspense fallback={<Skeleton className="h-32" />}>
					<Editor
						key={editorKey}
						firstLinePlaceholder="What are you trying to do, and what gets in the way? For a bug, what you did and what you expected."
						className="[&_.ProseMirror]:min-h-32"
						onChange={onChange}
						submit={onSubmit}
						categories={categories}
						defaultContent={initialDoc && isDocJson(initialDoc) ? initialDoc : undefined}
						hasTemplate={hasTemplate}
						hideBlockHandle
					/>
				</Suspense>
			) : (
				<Skeleton className="h-32" />
			)}
		</div>
	);
}
