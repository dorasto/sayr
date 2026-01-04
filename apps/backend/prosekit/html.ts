import type { schema } from "@repo/database";
import { JSDOM } from "jsdom";
import { DOMSerializer } from "prosemirror-model";
import { prosekitSchema } from "./schema";

export function prosekitJSONToHTML(jsonDoc: schema.NodeJSON): string {
	try {
		const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
		const document = dom.window.document;

		// Parse the JSON into a ProseMirror node
		const node = prosekitSchema.nodeFromJSON(jsonDoc);

		// Create serializer from schema
		const serializer = DOMSerializer.fromSchema(prosekitSchema);

		// Serialize the entire node (not just content) for a full doc
		// Use serializeNode for the doc node, or serializeFragment for its content
		const fragment = serializer.serializeFragment(node.content, {
			document,
		} as unknown as { document: Document });

		const container = document.createElement("div");
		container.appendChild(fragment);

		return container.innerHTML;
	} catch (error) {
		console.error("ProseKit → HTML conversion failed:", error);
		return "<p>[Invalid content]</p>";
	}
}
