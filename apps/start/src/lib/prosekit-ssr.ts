import { parseHTML } from "linkedom";
import { htmlFromJSON, createEditor } from "prosekit/core";
import type { NodeJSON } from "prosekit/core";
import { defineExtension } from "@/components/prosekit/extensions";
import { sanitizeDocJSON } from "@/components/prosekit/sanitize-doc";
import { extractTextContent } from "@/lib/util";

let cachedSchema: ReturnType<typeof createEditor>["schema"] | null = null;

function getSchema() {
	if (!cachedSchema) {
		cachedSchema = createEditor({ extension: defineExtension({ readonly: true }) }).schema;
	}
	return cachedSchema;
}

const HTML_ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

function escapeHtml(text: string): string {
	return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/**
 * Renders a ProseKit document to an HTML string (callers inject it with dangerouslySetInnerHTML). If the document
 * can't be serialized — e.g. it holds node types the schema doesn't know — falls back to its plain text, HTML-escaped,
 * since the raw text is user-controlled and would otherwise be injected as markup.
 */
export function prosekitHtmlFromJSON(doc: NodeJSON | null | undefined): string {
	if (!doc) return "";
	try {
		const schema = getSchema();
		const { document } = parseHTML("<!DOCTYPE html><html><body></body></html>");
		// The schema's raw toDOM emits stored hrefs/srcs as-is, so strip script-capable URLs first.
		return htmlFromJSON(sanitizeDocJSON(doc), {
			schema,
			document: document as unknown as Document,
		});
	} catch {
		return escapeHtml(extractTextContent(doc));
	}
}
