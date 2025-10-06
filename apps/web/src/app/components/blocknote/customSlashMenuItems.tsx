"use client";

import type { BlockNoteEditor } from "@blocknote/core";
import { filterSuggestionItems, insertOrUpdateBlock } from "@blocknote/core";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { getDefaultReactSlashMenuItems } from "@blocknote/react";
import {
	CheckSquare,
	Code,
	Heading1,
	Heading2,
	Heading3,
	Image as ImageIcon,
	List,
	ListOrdered,
	Quote,
	Table as TableIcon,
	Type,
} from "lucide-react";
import { HiOutlineGlobeAlt } from "react-icons/hi";

/**
 * Custom modifications for specific items
 * You can change title, icon, subtext, badge, aliases for any item
 */
const ITEM_CUSTOMIZATIONS: Record<string, Partial<DefaultReactSuggestionItem>> = {
	"Heading 1": {
		title: "Heading",
		icon: <Heading1 size={18} />,
		subtext: "Big section heading",
		badge: "⌘⌥1",
	},
	"Heading 2": {
		title: "Heading 2",
		icon: <Heading2 size={18} />,
		subtext: "Medium section heading",
		badge: "⌘⌥2",
	},
	"Heading 3": {
		title: "Heading 3",
		icon: <Heading3 size={18} />,
		subtext: "Small section heading",
		badge: "⌘⌥3",
	},
	Paragraph: {
		title: "Text",
		icon: <Type size={18} />,
		subtext: "Just start writing with plain text",
	},
	"Bullet List": {
		icon: <List size={18} />,
		subtext: "Create a simple bulleted list",
	},
	"Numbered List": {
		icon: <ListOrdered size={18} />,
		subtext: "Create a list with numbering",
	},
	"Check List": {
		icon: <CheckSquare size={18} />,
		subtext: "Track tasks with a checklist",
	},
	Image: {
		icon: <ImageIcon size={18} />,
		subtext: "Upload or embed an image",
	},
	Quote: {
		icon: <Quote size={18} />,
		subtext: "Capture a quote or citation",
	},
	Table: {
		icon: <TableIcon size={18} />,
		subtext: "Add a table to organize data",
	},
	"Code Block": {
		icon: <Code size={18} />,
		subtext: "Insert a code snippet",
	},
};

/**
 * Custom grouping configuration
 * Define your own groups and which items belong to them
 */
const CUSTOM_GROUPS: Record<string, string[]> = {
	Headings: ["Heading 1", "Heading 2", "Heading 3", "Heading 4", "Heading 5", "Heading 6"],
	Lists: ["Bullet List", "Numbered List", "Check List", "Numbered List Item", "Bullet List Item", "Check List Item"],
	Media: ["Image", "Video", "Audio"],
	Advanced: ["Table", "Code Block"],
	Text: ["Paragraph", "Quote"],
	Other: [], // Catch-all for remaining items
};

/**
 * Items to completely exclude from the slash menu
 * Add any item titles you want to hide
 */
const EXCLUDED_ITEMS = ["File"]; // Add items to exclude here

/**
 * Reorganize slash menu items into custom groups and apply customizations
 */
export const reorganizeSlashMenuItems = (items: DefaultReactSuggestionItem[]): DefaultReactSuggestionItem[] => {
	const reorganized: DefaultReactSuggestionItem[] = [];
	const processedTitles = new Set<string>();

	// Process items according to custom groups order
	for (const [groupName, itemTitles] of Object.entries(CUSTOM_GROUPS)) {
		for (const itemTitle of itemTitles) {
			const item = items.find((i) => i.title === itemTitle);
			// Skip if item is in exclusion list
			if (item && !processedTitles.has(item.title) && !EXCLUDED_ITEMS.includes(item.title)) {
				// Apply customizations if they exist for this item
				const customizations = ITEM_CUSTOMIZATIONS[item.title] || {};
				reorganized.push({
					...item,
					...customizations, // Override with custom properties
					group: groupName,
				});
				processedTitles.add(item.title);
			}
		}
	}

	// Add any remaining items to "Other" group (excluding items in EXCLUDED_ITEMS)
	for (const item of items) {
		if (!processedTitles.has(item.title) && !EXCLUDED_ITEMS.includes(item.title)) {
			const customizations = ITEM_CUSTOMIZATIONS[item.title] || {};
			reorganized.push({
				...item,
				...customizations, // Apply customizations to "Other" items too
				group: "Other",
			});
			processedTitles.add(item.title);
		}
	}

	return reorganized;
};

/**
 * Example custom slash menu item
 * This can be used as a template for creating your own custom items
 */
export const insertHelloWorldItem = (editor: BlockNoteEditor): DefaultReactSuggestionItem => ({
	title: "Insert Hello World",
	onItemClick: () => {
		// If the block containing the text caret is empty, `insertOrUpdateBlock`
		// changes its type to the provided block. Otherwise, it inserts the new
		// block below and moves the text caret to it.
		insertOrUpdateBlock(editor, {
			type: "paragraph",
			content: [{ type: "text", text: "Hello World", styles: { bold: true } }],
		});
	},
	aliases: ["helloworld", "hw"],
	group: "Other",
	icon: <HiOutlineGlobeAlt size={18} />,
	subtext: "Used to insert a block with 'Hello World' below.",
});

/**
 * Get custom slash menu items with reorganized groups
 * Combines default items (reorganized) with custom ones
 */
export const getCustomSlashMenuItems = (editor: BlockNoteEditor): DefaultReactSuggestionItem[] => {
	const defaultItems = getDefaultReactSlashMenuItems(editor);
	const reorganizedItems = reorganizeSlashMenuItems(defaultItems);

	return [...reorganizedItems, insertHelloWorldItem(editor)];
};

/**
 * Filter items based on query
 * This is used in the SuggestionMenuController's getItems prop
 */
export const getFilteredSlashMenuItems = async (
	editor: BlockNoteEditor,
	query: string
): Promise<DefaultReactSuggestionItem[]> => {
	return filterSuggestionItems(getCustomSlashMenuItems(editor), query);
};
