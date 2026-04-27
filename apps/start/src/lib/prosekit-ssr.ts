import { JSDOM } from "jsdom";
import { htmlFromJSON, createEditor } from "prosekit/core";
import type { NodeJSON } from "prosekit/core";
import { defineExtension } from "@/components/prosekit/extensions";
import { extractTextContent } from "@/lib/util";

let cachedSchema: ReturnType<typeof createEditor>["schema"] | null = null;

function getSchema() {
	if (!cachedSchema) {
		cachedSchema = createEditor({ extension: defineExtension({ readonly: true }) }).schema;
	}
	return cachedSchema;
}

export function prosekitHtmlFromJSON(doc: NodeJSON | null | undefined): string {
	if (!doc) return "";
	try {
		const schema = getSchema();
		const dom = new JSDOM();
		return htmlFromJSON(doc, {
			schema,
			document: dom.window.document,
		});
	} catch {
		return extractTextContent(doc);
	}
}
