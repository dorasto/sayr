import type { UISection, ParsedSection, UIPage, UIPageApi, ListItemTemplate } from "../types";

export interface ParsedPage {
	title: string;
	description?: string;
	api?: UIPageApi;
	sections: ParsedSection[];
}

export function parsePageConfig(page: UIPage): ParsedPage {
	return {
		title: page.title,
		description: page.description,
		api: page.api,
		sections: parsePage(page.sections),
	};
}

export function parsePage(sections?: UISection[]): ParsedSection[] {
	if (!sections?.length) return [];
	return sections.map(parseSection);
}

export function parseSection(section: UISection): ParsedSection {
	switch (section.type) {
		case "card": {
			return {
				type: "card",
				title: section.title,
				description: section.description,
				data: section.data,
				fields: section.fields ?? [],
				children: section.children ? parsePage(section.children) : [],
				actions: section.actions || [],
			};
		}

		case "tabs": {
			return {
				type: "tabs",
				tabs: section.tabs.map((tab) => ({
					id: tab.id,
					label: tab.label,
					content: parseSection(tab.content),
				})),
			};
		}

		case "grid": {
			return {
				type: "grid",
				columns: section.columns ?? 2,
				children: parsePage(section.children),
			};
		}

		case "list": {
			return {
				type: "list",
				data: section.data,
				title: section.title,
				description: section.description,
				item: parseListItemTemplate(section.item),
			};
		}

		default: {
			throw new Error("Unknown section type");
		}
	}
}

function parseListItemTemplate(item: ListItemTemplate) {
	return {
		fields: item.fields ?? [],
		children: item.children ? parsePage(item.children) : [],
		actions: item.actions ?? [],
		keyField: item.key,
	};
}
