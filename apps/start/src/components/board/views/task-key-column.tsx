import { formatTaskKey } from "@repo/util";
import { type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { TASK_KEY_COLUMN_VAR } from "../config/field-config";
import { useOptionalBoardOrganizationScope } from "../core/board-data";
import type { BoardItem } from "../core/board-item";

/** The org avatar and its gap in front of the key on a cross-org board (/home): `size-3.5` + `gap-1`. */
const ORG_AVATAR_PX = 18;
/** A hair of slack so subpixel text rendering never trips the key's `truncate`. */
const SLACK_PX = 2;

type KeyedItem = BoardItem & { shortId?: number | null; organization?: { shortId: string } | null };

/** The key text a row shows for an item (BoardRow's rules), or undefined for items without one (e.g. releases). */
function keyText(item: KeyedItem, orgShortId: string | undefined): string | undefined {
	if (item.shortId === undefined) return undefined;
	if (orgShortId) return formatTaskKey(orgShortId, item.shortId);
	if (item.organization) return formatTaskKey(item.organization.shortId, item.shortId);
	return item.shortId === null ? undefined : String(item.shortId);
}

/**
 * Wraps a board list and sizes its task-key column to the widest key among `items` (SAY-110), instead of a fixed
 * width sized for keys it may never show. Text is measured with the rows' own font on a canvas — one pass per item
 * change, no DOM observers, and keys in collapsed groups count too — and handed to the rows as the
 * `TASK_KEY_COLUMN_VAR` CSS variable (BoardRow's key slot reads it). On a cross-org board the org avatar is included.
 */
export function TaskKeyColumn({ items, children }: { items: readonly BoardItem[]; children: ReactNode }) {
	const ref = useRef<HTMLDivElement>(null);
	const scope = useOptionalBoardOrganizationScope();
	const [width, setWidth] = useState<number | null>(null);

	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		const keys = (items as readonly KeyedItem[])
			.map((item) => keyText(item, scope?.shortId))
			.filter((key): key is string => !!key);
		if (keys.length === 0) {
			setWidth(null);
			return;
		}
		const context = document.createElement("canvas").getContext("2d");
		if (!context) return;
		// The rows' key text: text-xs (0.75rem) font-medium, in the page's font.
		const rootSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
		context.font = `500 ${0.75 * rootSize}px ${getComputedStyle(el).fontFamily}`;
		const widest = Math.max(...keys.map((key) => context.measureText(key).width));
		const crossOrg = !scope && (items as readonly KeyedItem[]).some((item) => item.organization);
		const next = Math.ceil(widest + SLACK_PX + (crossOrg ? ORG_AVATAR_PX : 0));
		setWidth((prev) => (prev === next ? prev : next));
	}, [items, scope]);

	const style = width === null ? undefined : ({ [TASK_KEY_COLUMN_VAR]: `${width}px` } as CSSProperties);
	return (
		<div ref={ref} style={style}>
			{children}
		</div>
	);
}
