"use client"; // this registers <Editor> as a Client Component
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";

// Our <Editor> component we can reuse later
export default function Editor() {
	// Creates a new editor instance.
	const editor = useCreateBlockNote();

	// Renders the editor instance using a React component.
	return <BlockNoteView editor={editor} />;
}
