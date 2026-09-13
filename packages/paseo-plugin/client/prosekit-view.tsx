import type { ReactNode } from "react";
import { Fragment } from "react";
import { Linking, Platform, Text, View } from "react-native";
import type { ProsekitMark, ProsekitNode } from "../shared/prosekit";
import type { CategoryInfo, Org } from "../shared/task";
import { TaskMentionPill } from "./task-mention-pill";
import type { Theme } from "./types";
import { UserMentionPill } from "./user-mention-pill";

/**
 * Renders a ProseKit/ProseMirror document as real React Native elements —
 * actual headings, bold/italic/strike/underline/code runs, blockquotes,
 * lists, code blocks, and `@user`/`#task`/`!category` mentions rendered as
 * real button-styled pills (`apps/start/src/components/prosekit/ui/
 * mention-view.tsx`, `task-mention.tsx`) — instead of `shared/prosekit.ts`'s
 * `extractPlainText`, which only preserves paragraph/heading line breaks and
 * drops every inline mark and mention entirely. This needed no HTML/DOM
 * conversion (ProseKit's own "saving and loading" doc talks about
 * `generateHTML`, which isn't usable here — there's no DOM in a plugin
 * surface) — just walking the same JSON the CLI already returns and mapping
 * each node/mark type from the real editor schema
 * (`apps/start/src/components/prosekit/extensions/index.ts`'s
 * `defineBasicExtension()`) onto RN primitives.
 *
 * Mention pills are real `View`/`Pressable`-based chips (`task-mention-pill.tsx`,
 * `user-mention-pill.tsx`), not nested inside a `Text` run — React Native's
 * `Text` can only safely nest `Text`/`Image` as children on native platforms,
 * and a pill needs a real `Icon`/`Avatar` inside it, neither of which is safe
 * to nest in `Text`. So paragraph/heading content isn't one `<Text>` anymore:
 * consecutive plain-text/mark runs are grouped into their own `<Text>` (still
 * reflows normally), and each mention becomes a sibling item in a
 * `flexDirection: "row", flexWrap: "wrap"` container — visually inline
 * (wraps with the surrounding text, doesn't force its own line) without
 * gambling on Text's undocumented native behavior for non-Text children.
 *
 * Mentions store their own display text at insertion time
 * (`user-menu.tsx`/`task-menu.tsx`/`category-menu.tsx`'s `insertMention`
 * calls: `@username`, an org-prefixed task key like "SAY-27", `!category`) —
 * that's the label shown when the referenced user/category isn't in
 * `resolvers` (e.g. `resolvers` omitted entirely, or an id the caller didn't
 * fetch). When it IS resolvable, `resolvers.members`/`resolvers.categories`
 * upgrade the pill to the live name/avatar/color, same idea as the website's
 * own `MentionViewInner`. A task mention's status icon is always live
 * (`task-mention-pill.tsx` fetches it directly, deduped/cached against
 * whatever else on screen already queried the same task) — the label itself
 * still never fetches the live title, to avoid depending on a title that can
 * go stale after the mention was written. Tapping a task pill opens it via
 * `onOpenTask` — a task mention is only ever searched within the current org
 * (`task-menu.tsx`'s `searchOrgTasks` is scoped by `org_id`), so the
 * caller's own `orgSlug` always applies to the id, no lookup needed to
 * figure out which org.
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
	orgSlug: string;
	resolvers: MentionResolvers;
	onOpenTask?: (taskId: string) => void;
}

const MONOSPACE = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

function markStyle(marks: ProsekitMark[] | undefined, theme: Theme) {
	if (!marks || marks.length === 0) return { style: undefined, href: undefined };
	let fontWeight: "700" | undefined;
	let fontStyle: "italic" | undefined;
	let underline = false;
	let strike = false;
	let isCode = false;
	let isLink = false;
	let href: string | undefined;

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
			case "link": {
				isLink = true;
				const rawHref = typeof mark.attrs?.href === "string" ? mark.attrs.href : undefined;
				// Reject anything that isn't a plain http(s) URL (e.g. `javascript:`) — no onPress at all for those.
				if (rawHref && /^https?:\/\//i.test(rawHref)) href = rawHref;
				break;
			}
			default:
				break;
		}
	}

	const textDecorationLine: "underline line-through" | "underline" | "line-through" | undefined =
		underline && strike ? "underline line-through" : underline ? "underline" : strike ? "line-through" : undefined;

	return {
		style: {
			fontWeight,
			fontStyle,
			textDecorationLine,
			...(isCode ? { fontFamily: MONOSPACE, backgroundColor: theme.colors.surface2 } : {}),
			...(isLink ? { color: theme.colors.accent, textDecorationLine: "underline" as const } : {}),
		},
		href,
	};
}

function renderTextRun(node: ProsekitNode, ctx: Ctx, key: string): ReactNode {
	if (node.type === "hardBreak") return <Text key={key}>{"\n"}</Text>;
	if (typeof node.text !== "string") return null;
	const { style, href } = markStyle(node.marks, ctx.theme);
	return (
		<Text key={key} style={style} onPress={href ? () => Linking.openURL(href) : undefined}>
			{node.text}
		</Text>
	);
}

/** A `@user`/`#task`/`!category` mention pill — see the file header for what's live-resolved vs. stored-text-only. */
function renderMention(node: ProsekitNode, ctx: Ctx, key: string): ReactNode {
	const kind = typeof node.attrs?.kind === "string" ? node.attrs.kind : undefined;
	const id = typeof node.attrs?.id === "string" ? node.attrs.id : undefined;
	const storedValue = typeof node.attrs?.value === "string" ? node.attrs.value : "";

	if (kind === "user") {
		const member = ctx.resolvers.members?.find((m) => m.userId === id || m.user.id === id);
		return (
			<UserMentionPill key={key} theme={ctx.theme} member={member?.user} label={member?.user.name ?? storedValue} />
		);
	}

	if (kind === "task") {
		const label = storedValue || "task";
		if (!id) return <TaskMentionPill key={key} theme={ctx.theme} orgSlug={ctx.orgSlug} taskId="" label={label} />;
		return (
			<TaskMentionPill
				key={key}
				theme={ctx.theme}
				orgSlug={ctx.orgSlug}
				taskId={id}
				label={label}
				onPress={ctx.onOpenTask ? () => ctx.onOpenTask?.(id) : undefined}
			/>
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

/**
 * Renders one inline run (a paragraph's or heading's content) as a
 * `flexWrap` row: consecutive plain-text/mark nodes are grouped into a
 * single `<Text>` (reflows normally), and each mention becomes its own
 * sibling pill — see the file header for why mentions can't just be another
 * nested `<Text>` run.
 */
function renderInlineRow(nodes: ProsekitNode[] | undefined, ctx: Ctx, keyPrefix: string, textStyle: object): ReactNode {
	const items: ReactNode[] = [];
	let buffer: ProsekitNode[] = [];
	let index = 0;

	function flushBuffer() {
		if (buffer.length === 0) return;
		const key = `${keyPrefix}-t${index++}`;
		items.push(
			<Text key={key} style={textStyle}>
				{buffer.map((node, i) => renderTextRun(node, ctx, `${key}-${i}`))}
			</Text>
		);
		buffer = [];
	}

	for (const node of nodes ?? []) {
		if (node.type === "mention") {
			flushBuffer();
			items.push(renderMention(node, ctx, `${keyPrefix}-m${index++}`));
			continue;
		}
		buffer.push(node);
	}
	flushBuffer();

	return (
		<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 4, rowGap: 2 }}>
			{items}
		</View>
	);
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
				<Fragment key={key}>
					{renderInlineRow(node.content, ctx, key, {
						color: ctx.theme.colors.foreground,
						fontSize: 14,
						lineHeight: 20,
					})}
				</Fragment>
			);

		case "heading": {
			const level = typeof node.attrs?.level === "number" ? node.attrs.level : 1;
			return (
				<Fragment key={key}>{renderInlineRow(node.content, ctx, key, headingStyle(level, ctx.theme))}</Fragment>
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
 * styled React Native elements. `orgSlug` is required — a `#task` mention's
 * live status icon is fetched scoped to it (see `task-mention-pill.tsx`).
 * `resolvers` upgrades `@user`/`!category` mention pills to their live
 * name/avatar/color when the caller has that data loaded already (org
 * members, org categories) — entirely optional, and falls back to the
 * mention's own stored text when omitted or the id isn't found (see the file
 * header). `onOpenTask`, if given, makes `#task` mentions tappable.
 */
export function ProsekitView({
	theme,
	orgSlug,
	doc,
	resolvers = {},
	onOpenTask,
}: {
	theme: Theme;
	orgSlug: string;
	doc: ProsekitNode | null | undefined;
	resolvers?: MentionResolvers;
	onOpenTask?: (taskId: string) => void;
}) {
	if (!doc || !Array.isArray(doc.content)) return null;
	const ctx: Ctx = { theme, orgSlug, resolvers, onOpenTask };
	return <View style={{ gap: 8 }}>{renderBlocks(doc.content, ctx, "doc", 0)}</View>;
}
