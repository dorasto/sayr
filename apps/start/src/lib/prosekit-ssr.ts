import { parseHTML } from "linkedom";
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
		const { document } = parseHTML("<!DOCTYPE html><html><body></body></html>");
		return htmlFromJSON(doc, {
			schema,
			document: document as unknown as Document,
		});
	} catch {
		return extractTextContent(doc);
	}
}
