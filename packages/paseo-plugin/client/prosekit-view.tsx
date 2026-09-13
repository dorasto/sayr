import { Fragment } from "react";
import { Platform, Text, View } from "react-native";
import type { ProsekitMark, ProsekitNode } from "../shared/prosekit";
import type { CategoryInfo, Org } from "../shared/task";
import type { Theme } from "./types";

/**
 * Renders a ProseKit/ProseMirror document as real React Native elements —
 * actual headings, bold/italic/strike/underline/code runs, blockquotes,
 * lists, code blocks, and `@user`/`#task`/`!category` mention pills
 * (`apps/start/src/components/prosekit/ui/mention-view.tsx`,
 * `task-mention.tsx`) — instead of `shared/prosekit.ts`'s `extractPlainText`,
 * which only preserves paragraph/heading line breaks and drops every inline
 * mark and mention entirely. React Native's `Text` supports nested styled
 * `Text` children natively, so this needed no HTML/DOM conversion (ProseKit's
 * own "saving and loading" doc talks about `generateHTML`, which isn't
 * usable here — there's no DOM in a plugin surface) — just walking the same
 * JSON the CLI already returns and mapping each node/mark type from the real
 * editor schema (`apps/start/src/components/prosekit/extensions/index.ts`'s
 * `defineBasicExtension()`) onto RN primitives.
 *
 * Mentions store their own display text at insertion time
 * (`user-menu.tsx`/`task-menu.tsx`/`category-menu.tsx`'s `insertMention`
 * calls: `@username`, an org-prefixed task key like "SAY-27", `!category`) —
 * that's what's rendered when the referenced user/category isn't in
 * `resolvers` (e.g. `resolvers` omitted entirely, or an id the caller didn't
 * fetch). When it IS resolvable, `resolvers.members`/`resolvers.categories`
 * upgrade the pill to the live name/color, same idea as the website's own
 * `MentionViewInner`. Deliberately no avatar image or hover-card inside a
 * mention pill (the website's does both) — nesting an `Image` inside a `Text`
 * run works in RN in principle but isn't something to ship unverified when
 * there's no way to see the actual rendered result before asking for another
 * round of feedback; text-only pills are the safe subset. Task mentions never
 * fetch the live title (unlike the website) — only the stored key is shown —
 * to avoid an unbounded number of per-mention lookups on every render.
 *
 * Deliberately not exhaustive: tables and images fall back to rendering their
 * text content only (no grid/image display, no shiki-style syntax
 * highlighting in code blocks) — a real table/image/syntax-highlight
 * renderer is a separate, larger piece of work than mention/mark parity.
 */

export interface MentionResolvers {
	members?: Org["members"];
	categories?: CategoryInfo[];
}

interface Ctx {
	theme: Theme;
	resolvers: MentionResolvers;
}

const MONOSPACE = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

function markStyle(marks: ProsekitMark[] | undefined, theme: Theme) {
	if (!marks || marks.length === 0) return undefined;
	let fontWeight: "700" | undefined;
	let fontStyle: "italic" | undefined;
	let underline = false;
	let strike = false;
	let isCode = false;
	let isLink = false;

	for (const mark of marks) {
		switch (mark.type) {
			case "bold":
				fontWeight = "700";
				break;
			case "italic":
				fontStyle = "italic";
				break;
			case "underline":
				underline = true;
				break;
			case "strike":
				strike = true;
				break;
			case "code":
				isCode = true;
				break;
			case "link":
				isLink = true;
				break;
			default:
				break;
		}
	}

	const textDecorationLine: "underline line-through" | "underline" | "line-through" | undefined =
		underline && strike ? "underline line-through" : underline ? "underline" : strike ? "line-through" : undefined;

	return {
		fontWeight,
		fontStyle,
		textDecorationLine,
		...(isCode ? { fontFamily: MONOSPACE, backgroundColor: theme.colors.surface2 } : {}),
		...(isLink ? { color: theme.colors.accent, textDecorationLine: "underline" as const } : {}),
	};
}

/** A `@user`/`#task`/`!category` mention — see the file header for what's live-resolved vs. stored-text-only. */
function renderMention(node: ProsekitNode, ctx: Ctx, key: string) {
	const kind = typeof node.attrs?.kind === "string" ? node.attrs.kind : undefined;
	const id = typeof node.attrs?.id === "string" ? node.attrs.id : undefined;
	const storedValue = typeof node.attrs?.value === "string" ? node.attrs.value : "";
	const pillStyle = { color: ctx.theme.colors.accentForeground, backgroundColor: ctx.theme.colors.accent };

	if (kind === "user") {
		const member = ctx.resolvers.members?.find((m) => m.userId === id || m.user.id === id);
		const label = member?.user.name ? `@${member.user.name}` : storedValue || "@someone";
		return (
			<Text key={key} style={{ ...pillStyle, fontWeight: "600" }}>
				{label}
			</Text>
		);
	}

	if (kind === "task") {
		return (
			<Text key={key} style={{ ...pillStyle, fontWeight: "600" }}>
				{storedValue || "task"}
			</Text>
		);
	}

	if (kind === "category") {
		const category = ctx.resolvers.categories?.find((c) => c.id === id);
		const color = category?.color ?? ctx.theme.colors.accent;
		const name = category?.name ?? storedValue.replace(/^!/, "");
		return (
			<Text key={key}>
				<Text style={{ color }}>{"● "}</Text>
				<Text style={{ color: ctx.theme.colors.foreground, fontWeight: "600" }}>{name}</Text>
			</Text>
		);
	}

	return <Text key={key}>{storedValue}</Text>;
}

function renderInline(nodes: ProsekitNode[] | undefined, ctx: Ctx, keyPrefix: string) {
	if (!nodes) return null;
	return nodes.map((node, i) => {
		const key = `${keyPrefix}-${i}`;
		if (node.type === "hardBreak") return <Text key={key}>{"\n"}</Text>;
		if (node.type === "mention") return renderMention(node, ctx, key);
		if (typeof node.text !== "string") return null;
		return (
			<Text key={key} style={markStyle(node.marks, ctx.theme)}>
				{node.text}
			</Text>
		);
	});
}

function headingStyle(level: number, theme: Theme) {
	const fontSize = level <= 1 ? 20 : level === 2 ? 18 : level === 3 ? 16 : 14;
	return { color: theme.colors.foreground, fontSize, fontWeight: "700" as const, lineHeight: fontSize * 1.3 };
}

function listMarker(kind: string, index: number, checked: boolean | undefined): string {
	if (kind === "ordered") return `${index}.`;
	if (kind === "task") return checked ? "☑" : "☐";
	if (kind === "toggle") return "▸";
	return "•";
}

/** Renders one sibling run of block nodes, tracking ordered-list numbering across consecutive "list" siblings of kind "ordered". */
function renderBlocks(nodes: ProsekitNode[] | undefined, ctx: Ctx, keyPrefix: string, depth: number) {
	if (!nodes) return null;
	let orderedIndex = 0;

	return nodes.map((node, i) => {
		const key = `${keyPrefix}-${i}`;

		if (node.type === "list") {
			const kind = typeof node.attrs?.kind === "string" ? node.attrs.kind : "bullet";
			orderedIndex = kind === "ordered" ? orderedIndex + 1 : 0;
			const checked = typeof node.attrs?.checked === "boolean" ? node.attrs.checked : undefined;
			return (
				<View key={key} style={{ flexDirection: "row", marginLeft: depth * 16, gap: 6 }}>
					<Text style={{ color: ctx.theme.colors.foreground, fontSize: 14 }}>
						{listMarker(kind, orderedIndex, checked)}
					</Text>
					<View style={{ flex: 1, gap: 4 }}>{renderBlocks(node.content, ctx, key, depth + 1)}</View>
				</View>
			);
		}

		orderedIndex = 0;
		return renderBlock(node, ctx, key, depth);
	});
}

function renderBlock(node: ProsekitNode, ctx: Ctx, key: string, depth: number) {
	switch (node.type) {
		case "paragraph":
			if (!node.content || node.content.length === 0) return null;
			return (
				<Text key={key} style={{ color: ctx.theme.colors.foreground, fontSize: 14, lineHeight: 20 }}>
					{renderInline(node.content, ctx, key)}
				</Text>
			);

		case "heading": {
			const level = typeof node.attrs?.level === "number" ? node.attrs.level : 1;
			return (
				<Text key={key} style={headingStyle(level, ctx.theme)}>
					{renderInline(node.content, ctx, key)}
				</Text>
			);
		}

		case "blockquote":
			return (
				<View
					key={key}
					style={{
						borderLeftWidth: 3,
						borderLeftColor: ctx.theme.colors.border,
						paddingLeft: 10,
						gap: 4,
					}}
				>
					{renderBlocks(node.content, ctx, key, depth)}
				</View>
			);

		case "codeBlock":
			return (
				<View key={key} style={{ backgroundColor: ctx.theme.colors.surface2, borderRadius: 6, padding: 10 }}>
					<Text style={{ color: ctx.theme.colors.foreground, fontFamily: MONOSPACE, fontSize: 13 }}>
						{(node.content ?? []).map((child) => child.text ?? "").join("")}
					</Text>
				</View>
			);

		case "horizontalRule":
			return <View key={key} style={{ height: 1, backgroundColor: ctx.theme.colors.border, marginVertical: 4 }} />;

		case "image":
			return null;

		default:
			// Unrecognized container node (e.g. table): render its children
			// transparently rather than silently dropping the content.
			return node.content ? <Fragment key={key}>{renderBlocks(node.content, ctx, key, depth)}</Fragment> : null;
	}
}

/**
 * Renders a full ProseKit document (task description, comment body) as
 * styled React Native elements. `resolvers` upgrades `@user`/`!category`
 * mention pills to their live name/color when the caller has that data
 * loaded already (org members, org categories) — entirely optional, and
 * falls back to the mention's own stored text when omitted or the id isn't
 * found (see the file header).
 */
export function ProsekitView({
	theme,
	doc,
	resolvers = {},
}: {
	theme: Theme;
	doc: ProsekitNode | null | undefined;
	resolvers?: MentionResolvers;
}) {
	if (!doc || !Array.isArray(doc.content)) return null;
	const ctx: Ctx = { theme, resolvers };
	return <View style={{ gap: 8 }}>{renderBlocks(doc.content, ctx, "doc", 0)}</View>;
}
