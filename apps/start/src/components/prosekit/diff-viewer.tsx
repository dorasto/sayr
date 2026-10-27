import "prosekit/basic/style.css";
import "prosekit/basic/typography.css";
import "prosekit/extensions/commit/style.css";

import { createEditor, union, type NodeJSON } from "prosekit/core";
import { defineCommitViewer, type Commit } from "prosekit/extensions/commit";
import { defineReadonly } from "prosekit/extensions/readonly";
import { ReplaceStep } from "prosekit/pm/transform";
import { ProseKit } from "prosekit/react";
import { useMemo } from "react";
import { defineExtension } from "./extensions/index";
import { sanitizeDocJSON } from "./sanitize-doc";

interface DiffViewerProps {
	parentDoc: NodeJSON;
	currentDoc: NodeJSON;
	className?: string;
}

/**
 * A read-only editor that displays the diff between two document versions.
 * Uses ProseKit's commit extension to highlight additions (green) and deletions (red).
 */
export function DiffViewer({ parentDoc: rawParentDoc, currentDoc: rawCurrentDoc, className }: DiffViewerProps) {
	const editor = useMemo(() => {
		// This read-only view renders marks via the schema's raw toDOM (not the React link view), so stored
		// script-capable hrefs/srcs must be stripped before they reach the DOM.
		const parentDoc = sanitizeDocJSON(rawParentDoc);
		const currentDoc = sanitizeDocJSON(rawCurrentDoc);

		// First create a temporary editor to get the schema and convert JSON to nodes
		const baseExtension = defineExtension({ readonly: true });
		const tempEditor = createEditor({ extension: baseExtension });
		const schema = tempEditor.schema;

		// Convert JSON to ProseMirror nodes
		const parentNode = schema.nodeFromJSON(parentDoc);
		const currentNode = schema.nodeFromJSON(currentDoc);

		// Create a ReplaceStep that transforms the entire parent doc into the current doc
		// This is a simple approach that replaces the whole content
		const step = new ReplaceStep(0, parentNode.content.size, currentNode.slice(0, currentNode.content.size));

		// Create the commit object with the computed step
		const commit: Commit = {
			parent: parentDoc,
			doc: currentDoc,
			steps: [step.toJSON()],
		};

		// Create the final editor with the commit viewer
		const extension = union(baseExtension, defineReadonly(), defineCommitViewer(commit));

		return createEditor({ extension, defaultContent: currentDoc });
	}, [rawParentDoc, rawCurrentDoc]);

	return (
		<ProseKit editor={editor}>
			<div
				ref={editor.mount}
				className={`ProseMirror box-border min-h-full outline-none outline-0 [&_span[data-mention="tag"]]:text-violet-500 ${className ?? ""}`}
			/>
		</ProseKit>
	);
}
