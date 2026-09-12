import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import satori from "satori";
import sharp from "sharp";

// Module-level font cache — only fetched once per process lifetime.
// Mirrors apps/start/src/routes/api/og.tsx so both apps render OG images in
// the same brand style; landing only ever needs the single title+subtitle
// layout (no org logos or task-status bars).
let fontCache: ArrayBuffer | null = null;

async function getFont(): Promise<ArrayBuffer> {
	if (fontCache) return fontCache;
	const res = await fetch("https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf");
	if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
	fontCache = await res.arrayBuffer();
	return fontCache;
}

function truncate(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text;
	return `${text.slice(0, maxLen - 1)}…`;
}

// Brand colours (hex equivalents of the Sayr design system dark theme) —
// kept identical to apps/start/src/routes/api/og.tsx for visual consistency.
const BG = "#18181b";
const SURFACE = "#27272a";
const PRIMARY = "#e8a048";
const FG = "#ebebeb";
const MUTED = "#a1a1aa";
const BORDER = "#3f3f46";

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
			React.createElement("span", { style: { fontSize: 18, color: MUTED, fontWeight: 400 } }, "sayr.io")
		)
	);
}

function layout(params: { title: string; subtitle: string | null }) {
	const { title, subtitle } = params;

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
		React.createElement(
			"div",
			{
				style: {
					flex: 1,
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					padding: "80px 80px 48px 80px",
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
						maxWidth: 1040,
						display: "flex",
						flexWrap: "wrap",
					},
				},
				truncate(title, 50)
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
							maxWidth: 1040,
							display: "flex",
						},
					},
					truncate(subtitle, 90)
				)
		),
		footerPill()
	);
}

async function generateOgImage(params: { title: string; subtitle: string | null }): Promise<Response> {
	const fontData = await getFont();
	const element = layout(params);

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

	const png = await sharp(Buffer.from(svg)).png().toBuffer();

	return new Response(png, {
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
				const title = url.searchParams.get("title") || "Sayr";
				const subtitle = url.searchParams.get("subtitle");

				try {
					return await generateOgImage({ title, subtitle });
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
