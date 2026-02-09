import MarkdownIt from "markdown-it";
import { MarkdownParser } from "prosemirror-markdown";
import type { schema } from "@repo/database";
import { basicGithubSchema } from "./basicGithubSchema";

/**
 * GitHub / Linear-style Markdown
 * - No images
 * - No HTML
 * - Text-only, safe
 */
const md = new MarkdownIt({
    html: false, // 🚫 disable HTML entirely
    linkify: true,
    breaks: true,
});
/**
 * Markdown → ProseKit (ProseMirror) parser
 */
const prosekitMarkdownParser = new MarkdownParser(
    basicGithubSchema,
    md,
    {
        // --------------------
        // Block nodes
        // --------------------
        paragraph: { block: "paragraph" },
        blockquote: { block: "blockquote" },

        heading: {
            block: "heading",
            getAttrs: (tok) => ({
                level: Number(tok.tag.slice(1)),
            }),
        },

        bullet_list: { block: "bulletList" },

        ordered_list: {
            block: "orderedList",
            getAttrs: (tok) => ({
                start: tok.attrGet("start")
                    ? Number(tok.attrGet("start"))
                    : 1,
            }),
        },

        list_item: { block: "listItem" },

        fence: {
            block: "codeBlock",
            getAttrs: (tok) => ({
                language: tok.info || null,
            }),
        },

        code_block: {
            block: "codeBlock",
            getAttrs: (tok) => ({
                language: tok.info || null,
            }),
        },

        hr: { node: "horizontalRule" },
        hardbreak: { node: "hardBreak" },

        // --------------------
        // Marks
        // --------------------
        em: { mark: "italic" },
        strong: { mark: "bold" },
        s: { mark: "strike" },
        code_inline: { mark: "code" },

        link: {
            mark: "link",
            getAttrs: (tok) => ({
                href: tok.attrGet("href"),
                title: tok.attrGet("title"),
            }),
        },
    }
);
function stripGithubImages(markdown: string): string {
    return markdown.replace(
        /<img\b[^>]*>/gi,
        ""
    );
}
/**
 * Convert Markdown → ProseKit JSON
 */
export function markdownToProsekitJSON(
    markdown: string
): schema.NodeJSON {
    try {
        const sanitized = stripGithubImages(markdown);

        const doc = prosekitMarkdownParser.parse(sanitized);
        return doc.toJSON();
    } catch (error) {
        console.error("Markdown → ProseKit conversion failed:", error);
        return {
            type: "doc",
            content: [],
        };
    }
}