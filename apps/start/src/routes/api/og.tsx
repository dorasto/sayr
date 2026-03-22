import { Resvg } from "@resvg/resvg-js";
import { createFileRoute } from "@tanstack/react-router";
import satori from "satori";
import React from "react";
import sharp from "sharp";

// Module-level font cache — only fetched once per process lifetime
let fontCache: ArrayBuffer | null = null;

async function getFont(): Promise<ArrayBuffer> {
	if (fontCache) return fontCache;
	const res = await fetch(
		"https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf",
	);
	if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
	fontCache = await res.arrayBuffer();
	return fontCache;
}

// Convert a remote image URL to a base64 PNG data URI for satori.
// Satori only supports PNG and JPEG — WebP/AVIF/GIF are converted via sharp.
async function toDataUri(url: string): Promise<string | null> {
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
		if (!res.ok) return null;
		const buf = Buffer.from(await res.arrayBuffer());
		const mime = res.headers.get("content-type") || "image/png";

		// Convert non-PNG/JPEG formats to PNG so satori can render them
		if (!mime.includes("png") && !mime.includes("jpeg") && !mime.includes("jpg")) {
			const pngBuf = await sharp(buf).png().toBuffer();
			return `data:image/png;base64,${pngBuf.toString("base64")}`;
		}

		return `data:${mime};base64,${buf.toString("base64")}`;
	} catch {
		return null;
	}
}

function truncate(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text;
	return `${text.slice(0, maxLen - 1)}…`;
}

// Brand colours (hex equivalents of the Sayr design system dark theme)
const BG = "#18181b";
const SURFACE = "#27272a";
const PRIMARY = "#e8a048";
const FG = "#ebebeb";
const MUTED = "#a1a1aa";
const BORDER = "#3f3f46";

// Status colours — must stay in sync with statusConfig in config.tsx
const STATUS_COLORS: Record<string, string> = {
	backlog: "#6B7280",
	todo: "#3B82F6",
	"in-progress": "#F59E0B",
	done: "#10B981",
	canceled: "#EF4444",
};

const STATUS_LABELS: Record<string, string> = {
	backlog: "Backlog",
	todo: "Todo",
	"in-progress": "In Progress",
	done: "Done",
	canceled: "Canceled",
};

const STATUS_ORDER = ["backlog", "todo", "in-progress", "done", "canceled"];

export type OgStatItem = { status: string; count: number };

/**
 * Renders a segmented progress bar + legend row for task status counts.
 *
 * Bar: a single rounded rect split into coloured segments proportional to count.
 * Legend: dot + "N Label" for each status that has count > 0.
 */
function statsRow(stats: OgStatItem[]) {
	// Only show statuses with count > 0, in canonical order
	const visible = STATUS_ORDER.map((s) => stats.find((item) => item.status === s)).filter(
		(item): item is OgStatItem => !!item && item.count > 0,
	);
	if (visible.length === 0) return null;

	const total = visible.reduce((sum, item) => sum + item.count, 0);
	const BAR_WIDTH = 680; // px — fits inside the text column with logo present
	const BAR_HEIGHT = 10;
	const GAP = 3; // gap between segments
	const RADIUS = BAR_HEIGHT / 2;

	// Build segments as individual rounded rects using SVG
	// We calculate each segment's x + width, then emit them as a single SVG
	const segments: Array<{ x: number; w: number; color: string }> = [];
	let cursor = 0;
	const totalGap = GAP * (visible.length - 1);
	const availableWidth = BAR_WIDTH - totalGap;

	visible.forEach((item, i) => {
		const w = Math.max(RADIUS * 2, (item.count / total) * availableWidth);
		segments.push({ x: cursor, w, color: STATUS_COLORS[item.status] ?? MUTED });
		cursor += w + (i < visible.length - 1 ? GAP : 0);
	});

	// Render bar as a data URI SVG embedded in an <img> (satori handles this reliably)
	const svgParts: string[] = [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${BAR_WIDTH}" height="${BAR_HEIGHT}">`,
	];
	segments.forEach(({ x, w, color }, i) => {
		const isFirst = i === 0;
		const isLast = i === segments.length - 1;
		// Per-segment rounded corners: first → left rounded, last → right rounded, single → fully rounded
		const rx = RADIUS;
		if (visible.length === 1) {
			svgParts.push(`<rect x="${x}" y="0" width="${w}" height="${BAR_HEIGHT}" rx="${rx}" fill="${color}"/>`);
		} else if (isFirst) {
			// Left side rounded only
			svgParts.push(
				`<path d="M${x + rx},0 h${w - rx} v${BAR_HEIGHT} h${-(w - rx)} a${rx},${rx} 0 0 1 -${rx},-${rx} v${-(BAR_HEIGHT - rx * 2)} a${rx},${rx} 0 0 1 ${rx},-${rx} z" fill="${color}"/>`,
			);
		} else if (isLast) {
			// Right side rounded only
			svgParts.push(
				`<path d="M${x},0 h${w - rx} a${rx},${rx} 0 0 1 ${rx},${rx} v${BAR_HEIGHT - rx * 2} a${rx},${rx} 0 0 1 -${rx},${rx} h${-(w - rx)} v${-BAR_HEIGHT} z" fill="${color}"/>`,
			);
		} else {
			svgParts.push(`<rect x="${x}" y="0" width="${w}" height="${BAR_HEIGHT}" fill="${color}"/>`);
		}
	});
	svgParts.push("</svg>");
	const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgParts.join(""))}`;

	// Legend row: dot + "N Label" per status
	const legendItems = visible.map((item) => {
		const color = STATUS_COLORS[item.status] ?? MUTED;
		const label = STATUS_LABELS[item.status] ?? item.status;
		return React.createElement(
			"div",
			{
				key: item.status,
				style: { display: "flex", alignItems: "center", gap: 6 },
			},
			React.createElement("div", {
				style: {
					width: 8,
					height: 8,
					borderRadius: "50%",
					backgroundColor: color,
					display: "flex",
					flexShrink: 0,
				},
			}),
			React.createElement(
				"span",
				{ style: { fontSize: 20, color: MUTED, fontWeight: 400 } },
				`${item.count} ${label}`,
			),
		);
	});

	return React.createElement(
		"div",
		{
			style: {
				display: "flex",
				flexDirection: "column",
				gap: 12,
				marginTop: 28,
			},
		},
		// Segmented bar
		React.createElement("img", {
			src: svgDataUri,
			width: BAR_WIDTH,
			height: BAR_HEIGHT,
			alt: "",
			style: { display: "flex" },
		}),
		// Legend
		React.createElement(
			"div",
			{ style: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 16 } },
			...legendItems,
		),
	);
}

// Shared footer pill — always rendered at the bottom of every layout
function footerPill() {
	return React.createElement(
		"div",
		{
			style: {
				display: "flex",
				alignItems: "center",
				padding: "0 80px 48px 80px",
			},
		},
		React.createElement(
			"div",
			{
				style: {
					display: "flex",
					alignItems: "center",
					gap: 8,
					padding: "8px 20px",
					backgroundColor: SURFACE,
					borderRadius: 100,
					border: `1px solid ${BORDER}`,
				},
			},
			React.createElement("div", {
				style: {
					width: 8,
					height: 8,
					borderRadius: "50%",
					backgroundColor: PRIMARY,
					display: "flex",
				},
			}),
			React.createElement(
				"span",
				{ style: { fontSize: 18, color: MUTED, fontWeight: 400 } },
				"sayr.io",
			),
		),
	);
}

// Shared top accent bar
function accentBar() {
	return React.createElement("div", {
		style: {
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			height: 4,
			backgroundColor: PRIMARY,
			display: "flex",
		},
	});
}

/**
 * "detailed" layout — for entity pages (tasks, release detail, etc.)
 *
 * Structure (no logo):
 *   [top accent bar]
 *   [muted meta/org name]
 *   [large title]
 *   [muted subtitle]
 *   [sayr.io pill]
 *
 * Structure (with logo):
 *   [top accent bar]
 *   [logo square — left] | [muted meta, large title, muted subtitle — right]
 *   [sayr.io pill]
 */
function detailedLayout(params: {
	title: string;
	subtitle: string | null;
	meta: string | null;
	logoDataUri: string | null;
	stats: OgStatItem[] | null;
}) {
	const { title, subtitle, meta, logoDataUri, stats } = params;

	const textBlock = React.createElement(
		"div",
		{
			style: {
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				flex: 1,
			},
		},
		// Org name above title
		meta &&
			React.createElement(
				"div",
				{
					style: {
						fontSize: 28,
						color: MUTED,
						fontWeight: 400,
						letterSpacing: "-0.01em",
						marginBottom: 20,
						display: "flex",
					},
				},
				truncate(meta, 50),
			),
		// Title
		React.createElement(
			"div",
			{
				style: {
					fontSize: 72,
					fontWeight: 700,
					color: FG,
					lineHeight: 1.05,
					letterSpacing: "-0.04em",
					maxWidth: logoDataUri ? 760 : 1040,
					display: "flex",
					flexWrap: "wrap",
				},
			},
			truncate(title, logoDataUri ? 35 : 60),
		),
		// Subtitle
		subtitle &&
			React.createElement(
				"div",
				{
					style: {
						marginTop: 24,
						fontSize: 36,
						color: MUTED,
						fontWeight: 400,
						letterSpacing: "-0.01em",
						display: "flex",
					},
				},
				truncate(subtitle, 60),
			),
		// Stats row (optional)
		stats && statsRow(stats),
	);

	return React.createElement(
		"div",
		{
			style: {
				width: 1200,
				height: 630,
				display: "flex",
				flexDirection: "column",
				backgroundColor: BG,
				fontFamily: "Inter",
				position: "relative",
				padding: "0",
			},
		},
		accentBar(),
		// Main content
		React.createElement(
			"div",
			{
				style: {
					flex: 1,
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					padding: "80px 80px 48px 80px",
					gap: 56,
				},
			},
			// Left: logo (if present)
			logoDataUri &&
				React.createElement(
					"div",
					{
						style: {
							width: 200,
							height: 200,
							borderRadius: 24,
							overflow: "hidden",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							backgroundColor: SURFACE,
							border: `2px solid ${BORDER}`,
							flexShrink: 0,
						},
					},
					React.createElement("img", {
						src: logoDataUri,
						width: 200,
						height: 200,
						alt: "",
						style: { objectFit: "cover", width: "100%", height: "100%" },
					}),
				),
			// Right (or full-width): text
			textBlock,
		),
		footerPill(),
	);
}

/**
 * "simple" layout — for list/section pages (releases list, admin views, etc.)
 *
 * Structure (no logo):
 *   [top accent bar]
 *   [large title] — vertically centred
 *   [muted subtitle] — optional
 *   [sayr.io pill]
 *
 * Structure (with logo):
 *   [top accent bar]
 *   [large title] [logo square — right side]
 *   [muted subtitle]
 *   [sayr.io pill]
 */
function simpleLayout(params: { title: string; subtitle: string | null; logoDataUri: string | null }) {
	const { title, subtitle, logoDataUri } = params;

	return React.createElement(
		"div",
		{
			style: {
				width: 1200,
				height: 630,
				display: "flex",
				flexDirection: "column",
				backgroundColor: BG,
				fontFamily: "Inter",
				position: "relative",
				padding: "0",
			},
		},
		accentBar(),
		// Main content — vertically centred
		React.createElement(
			"div",
			{
				style: {
					flex: 1,
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "80px 80px 48px 80px",
					gap: 48,
				},
			},
			// Left: optional logo
			logoDataUri &&
				React.createElement(
					"div",
					{
						style: {
							width: 200,
							height: 200,
							borderRadius: 24,
							overflow: "hidden",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							backgroundColor: SURFACE,
							border: `2px solid ${BORDER}`,
							flexShrink: 0,
						},
					},
					React.createElement("img", {
						src: logoDataUri,
						width: 200,
						height: 200,
						alt: "",
						style: { objectFit: "cover", width: "100%", height: "100%" },
					}),
				),
			// Right: title + subtitle
			React.createElement(
				"div",
				{
					style: {
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						flex: 1,
					},
				},
				React.createElement(
					"div",
					{
						style: {
							fontSize: 80,
							fontWeight: 700,
							color: FG,
							lineHeight: 1.05,
							letterSpacing: "-0.04em",
							maxWidth: logoDataUri ? 760 : 1040,
							display: "flex",
							flexWrap: "wrap",
						},
					},
					truncate(title, logoDataUri ? 35 : 50),
				),
				subtitle &&
					React.createElement(
						"div",
						{
							style: {
								marginTop: 28,
								fontSize: 36,
								color: MUTED,
								fontWeight: 400,
								letterSpacing: "-0.01em",
								display: "flex",
							},
						},
						truncate(subtitle, 60),
					),
			),
		),
		footerPill(),
	);
}

async function generateOgImage(params: {
	type: "detailed" | "simple";
	title: string;
	subtitle: string | null;
	meta: string | null;
	logoUrl: string | null;
	stats: OgStatItem[] | null;
}): Promise<Response> {
	const { type, title, subtitle, meta, logoUrl, stats } = params;

	const [fontData, logoDataUri] = await Promise.all([
		getFont(),
		logoUrl ? toDataUri(logoUrl) : Promise.resolve(null),
	]);

	const element =
		type === "simple"
			? simpleLayout({ title, subtitle, logoDataUri })
			: detailedLayout({ title, subtitle, meta, logoDataUri, stats });

	const svg = await satori(element, {
		width: 1200,
		height: 630,
		fonts: [
			{
				name: "Inter",
				data: fontData,
				weight: 400,
				style: "normal",
			},
		],
	});

	const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
	const png = resvg.render().asPng();

	return new Response(png.buffer as ArrayBuffer, {
		status: 200,
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
		},
	});
}

export const Route = createFileRoute("/api/og")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const type = url.searchParams.get("type") === "simple" ? "simple" : "detailed";
				const title = url.searchParams.get("title") || "Sayr";
				const subtitle = url.searchParams.get("subtitle");
				const meta = url.searchParams.get("meta");
				const logoUrl = url.searchParams.get("logo");
				const statsRaw = url.searchParams.get("stats");
				let stats: OgStatItem[] | null = null;
				if (statsRaw) {
					try {
						const parsed = JSON.parse(statsRaw);
						if (Array.isArray(parsed)) stats = parsed as OgStatItem[];
					} catch {
						// ignore malformed stats param
					}
				}

				try {
					return await generateOgImage({ type, title, subtitle, meta, logoUrl, stats });
				} catch (err) {
					console.error("[og] Failed to generate OG image:", err);
					return new Response("Failed to generate image", {
						status: 500,
						headers: { "Content-Type": "text/plain" },
					});
				}
			},
		},
	},
});
