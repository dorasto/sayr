import { defineClickHandler, defineCommands, defineMarkSpec, toggleMark, union } from "prosekit/core";
import type { Attrs } from "prosekit/pm/model";
import type { Extension } from "prosekit/core";
import { TextSelection } from "prosekit/pm/state";

/**
 * Mark spec for template placeholders.
 * Text marked with this renders as a styled `<span>` with a CSS class.
 * Styling is handled purely via CSS using data attributes on the editor root
 * (`data-template-editor` / `data-has-template`) to differentiate modes.
 *
 * This avoids `defineReactMarkView` which causes re-rendering bugs.
 */
function defineTemplatePlaceholderSpec(): Extension<{
	Marks: {
		templatePlaceholder: Attrs;
	};
}> {
	return defineMarkSpec({
		name: "templatePlaceholder" as const,
		inclusive: false,
		parseDOM: [{ tag: "span[data-template-placeholder]" }],
		toDOM() {
			return [
				"span",
				{
					"data-template-placeholder": "true",
					class: "template-placeholder",
				},
				0,
			];
		},
	});
}

/**
 * Toggle command for the templatePlaceholder mark — works exactly like toggleBold/toggleItalic.
 */
function defineTemplatePlaceholderCommands(): Extension<{
	Commands: {
		toggleTemplatePlaceholder: [];
	};
}> {
	return defineCommands({
		toggleTemplatePlaceholder: () => toggleMark({ type: "templatePlaceholder" }),
	});
}

/**
 * Click handler for consumer mode (hasTemplate = true).
 * When a user clicks on placeholder-marked text, it selects the entire
 * placeholder range. The user can then type to replace it — since the mark
 * has `inclusive: false`, the replacement text won't inherit the placeholder mark.
 *
 * Register this extension only when `hasTemplate` is true.
 */
export function defineTemplatePlaceholderClickHandler() {
	return defineClickHandler((view, pos, _event) => {
		if (!view.editable) return false;

		const { state } = view;
		const markType = state.schema.marks.templatePlaceholder;
		if (!markType) return false;

		const $pos = state.doc.resolve(pos);
		const parent = $pos.parent;

		// Find the contiguous range of text nodes with the templatePlaceholder mark
		// that contains the clicked position
		let from = -1;
		let to = -1;

		parent.forEach((child, childOffset) => {
			const childFrom = $pos.start() + childOffset;
			const childTo = childFrom + child.nodeSize;
			if (child.marks.some((m) => m.type === markType)) {
				if (pos >= childFrom && pos < childTo) {
					if (from === -1) from = childFrom;
					to = childTo;
				}
			}
		});

		// Expand to adjacent siblings that also have the mark
		if (from !== -1) {
			let expanded = true;
			while (expanded) {
				expanded = false;
				parent.forEach((child, childOffset) => {
					const childFrom = $pos.start() + childOffset;
					const childTo = childFrom + child.nodeSize;
					if (child.marks.some((m) => m.type === markType)) {
						if (childTo === from) {
							from = childFrom;
							expanded = true;
						}
						if (childFrom === to) {
							to = childTo;
							expanded = true;
						}
					}
				});
			}
		}

		if (from === -1 || to === -1) return false;

		// Select the entire placeholder range so the next keystroke replaces it
		const tr = state.tr.setSelection(TextSelection.create(state.doc, from, to));
		view.dispatch(tr);
		return true;
	});
}

/**
 * Full template-placeholder extension: mark spec + toggle command.
 * Styling is handled via CSS (no React mark view needed).
 */
export function defineTemplatePlaceholder() {
	return union(defineTemplatePlaceholderSpec(), defineTemplatePlaceholderCommands());
}
