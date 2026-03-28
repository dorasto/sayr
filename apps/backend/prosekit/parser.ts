//@ts-expect-error
import MarkdownIt from "markdown-it";
import { MarkdownParser } from "prosemirror-markdown";
import type { schema } from "@repo/database";
import { prosekitSchema } from "./schema";

const md = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
});

const prosekitMarkdownParser = new MarkdownParser(
    prosekitSchema,
    md,
    {
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

export function markdownToProsekitJSON(markdown: string): schema.NodeJSON {
    try {
        if (!markdown || markdown.trim() === "") {
            return {
                type: "doc",
                content: [],
            };
        }

        const doc = prosekitMarkdownParser.parse(markdown);
        return doc.toJSON() as schema.NodeJSON;
    } catch (error) {
        console.error("Markdown → ProseKit conversion failed:", error);
        return {
            type: "doc",
            content: [],
        };
    }
}
