import { createContext, useContext } from "react";

/**
 * Context to communicate editor mode to node views.
 * - `isTemplateEditor`: true when authoring a template (can edit placeholder labels)
 * - `hasTemplate`: true when consuming a template (placeholders become clickable fill-ins)
 */
export const EditorModeContext = createContext<{
	isTemplateEditor: boolean;
	hasTemplate: boolean;
}>({
	isTemplateEditor: false,
	hasTemplate: false,
});

export function useEditorMode() {
	return useContext(EditorModeContext);
}
