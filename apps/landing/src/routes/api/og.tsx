import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import satori from "satori";
import sharp from "sharp";
import { DEMO_TASKS, type DemoStatus, FEATURED_TASK, ORG, PEOPLE } from "@/components/landing/app-ui/demo-data";

// Open Graph images for the marketing site, rendered with satori → sharp.
// `?template=home` is the homepage card: the hero's headline on the left and
// the hero's product demo (team board + public post, same Doras demo data)
// bleeding off the right, like Featurebase's and ClickUp's cards. Any other
// request gets the generic title/subtitle card used by docs and feature pages.

const WEIGHTS = [400, 500, 700] as const;
type Weight = (typeof WEIGHTS)[number];

// Module-level font cache, fetched once per process.
let fontCache: { weight: Weight; data: ArrayBuffer }[] | null = null;

async function getFonts() {
	if (fontCache) return fontCache;
	fontCache = await Promise.all(
		WEIGHTS.map(async (weight) => {
			const res = await fetch(`https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-${weight}-normal.ttf`);
			if (!res.ok) throw new Error(`Font fetch failed (${weight}): ${res.status}`);
			return { weight, data: await res.arrayBuffer() };
		})
	);
	return fontCache;
}

function truncate(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text;
	return `${text.slice(0, maxLen - 1)}…`;
}

// Hex equivalents of the Sayr dark theme (satori can't read CSS variables).
const BG = "#141416";
const WINDOW = "#1b1b1e";
const CARD = "#222226";
const ROW_HL = "#2a2418";
const PRIMARY = "#e8a048";
const SUCCESS = "#22c55e";
const FG = "#ededed";
const MUTED = "#9a9aa3";
const BORDER = "#323238";

const SAYR_PATH =
	"M2616.835,206.326c221.574,-279.539 1356.778,11.143 1012.569,405.733c-627.971,719.885 -992.64,1215.012 -340.463,1173.098c652.177,-41.913 641.375,505.084 421.61,666.814c-908.028,668.234 -1228.018,1941.949 -1315.043,2388.13c-5.294,29.318 -26.875,53.034 -55.566,61.061c-28.691,8.027 -59.445,-1.046 -79.185,-23.36c-83.111,-93.831 -195.739,-221.149 -267.895,-302.717c-42.587,-48.142 -53.205,-116.691 -27.179,-175.462c118.808,-268.721 409.972,-1013.555 -17.426,-1003.881c-521.333,11.8 -1076.417,403.429 -631.533,-319.294c444.885,-722.724 910.824,-2378.996 1300.11,-2870.122Z";

function SayrMark({ size }: { size: number }) {
	return (
		<svg aria-hidden="true" width={size} height={size} viewBox="0 0 5000 5000">
			<path d={SAYR_PATH} fill={PRIMARY} />
		</svg>
	);
}

function Brand() {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 14 }}>
			<SayrMark size={40} />
			<span style={{ fontSize: 34, fontWeight: 700, color: FG, letterSpacing: "-0.02em" }}>Sayr</span>
		</div>
	);
}

/** The app's status icons, simplified to SVG shapes satori can draw. */
function StatusDot({ status, size = 18 }: { status: DemoStatus; size?: number }) {
	if (status === "done") {
		return (
			<svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">
				<circle cx="12" cy="12" r="9" fill="none" stroke={SUCCESS} strokeWidth="2.2" />
				<path d="M8 12.5l2.6 2.6L16 9.6" fill="none" stroke={SUCCESS} strokeWidth="2.2" />
			</svg>
		);
	}
	if (status === "in-progress") {
		return (
			<svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">
				<circle cx="12" cy="12" r="9" fill="none" stroke={PRIMARY} strokeWidth="2.2" />
				<path d="M12 6.5a5.5 5.5 0 0 1 0 11Z" fill={PRIMARY} />
			</svg>
		);
	}
	return (
		<svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">
			<circle
				cx="12"
				cy="12"
				r="9"
				fill="none"
				stroke={MUTED}
				strokeWidth="2.2"
				strokeDasharray={status === "backlog" ? "3 3" : undefined}
			/>
		</svg>
	);
}

function VoteArrow({ size = 12, color = FG }: { size?: number; color?: string }) {
	return (
		<svg aria-hidden="true" width={size} height={size} viewBox="0 0 12 12">
			<path d="M6 2l4.5 7h-9Z" fill={color} />
		</svg>
	);
}

function Avatar({ initials, color, size = 26 }: { initials: string; color: string; size?: number }) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				width: size,
				height: size,
				borderRadius: 999,
				backgroundColor: color,
				color: "#fff",
				fontSize: size * 0.4,
				fontWeight: 700,
			}}
		>
			{initials}
		</div>
	);
}

const SHOWN_VOTES = 153;
const BOARD_KEYS = [FEATURED_TASK.key, "DOR-221", "DOR-209", "DOR-198", "DOR-230"];
const GROUPS: { status: DemoStatus; label: string }[] = [
	{ status: "in-progress", label: "In Progress" },
	{ status: "todo", label: "Todo" },
	{ status: "backlog", label: "Backlog" },
];

function BoardRow({
	title,
	keyLabel,
	status,
	highlighted,
}: {
	title: string;
	keyLabel: string;
	status: DemoStatus;
	highlighted: boolean;
}) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 16,
				height: 50,
				padding: "0 22px",
				borderBottom: `1px solid ${BORDER}`,
				backgroundColor: highlighted ? ROW_HL : WINDOW,
				fontSize: 19,
			}}
		>
			<span style={{ width: 92, color: MUTED, fontSize: 16 }}>{keyLabel}</span>
			<StatusDot status={status} />
			<span style={{ color: FG }}>{title}</span>
			{highlighted && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 6,
						marginLeft: 12,
						padding: "3px 10px",
						borderRadius: 6,
						backgroundColor: "#3a2c14",
						color: PRIMARY,
						fontSize: 15,
					}}
				>
					<VoteArrow size={10} color={PRIMARY} /> {SHOWN_VOTES}
				</div>
			)}
		</div>
	);
}

/** The team's board, bleeding off the right edge of the card. */
function TeamBoard() {
	// The featured task is shown shipped-ready: in progress, highlighted.
	const tasks = DEMO_TASKS.filter((task) => BOARD_KEYS.includes(task.key));
	return (
		<div
			style={{
				position: "absolute",
				left: 610,
				top: 64,
				width: 720,
				height: 620,
				display: "flex",
				flexDirection: "column",
				backgroundColor: WINDOW,
				border: `1px solid ${BORDER}`,
				borderRadius: 18,
				overflow: "hidden",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 10,
					height: 52,
					padding: "0 22px",
					borderBottom: `1px solid ${BORDER}`,
					fontSize: 17,
					color: MUTED,
				}}
			>
				<SayrMark size={18} />
				<span>{ORG.name}</span>
				<span>/</span>
				<span style={{ color: FG, fontWeight: 500 }}>Tasks</span>
			</div>
			{GROUPS.map((group) => {
				const rows = tasks.filter((task) => task.status === group.status);
				return (
					<div key={group.status} style={{ display: "flex", flexDirection: "column" }}>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 10,
								height: 42,
								padding: "0 22px",
								backgroundColor: "#202024",
								fontSize: 16,
								color: FG,
							}}
						>
							<StatusDot status={group.status} size={16} />
							<span style={{ fontWeight: 500 }}>{group.label}</span>
							<span style={{ color: MUTED }}>{rows.length}</span>
						</div>
						{rows.map((task) => (
							<BoardRow
								key={task.key}
								keyLabel={task.key}
								title={task.title}
								status={task.status}
								highlighted={task.key === FEATURED_TASK.key}
							/>
						))}
					</div>
				);
			})}
		</div>
	);
}

/** The same task on the public portal, overlapping the board. */
function PublicPost() {
	return (
		<div
			style={{
				position: "absolute",
				left: 700,
				top: 318,
				width: 440,
				display: "flex",
				flexDirection: "column",
				backgroundColor: CARD,
				border: `1px solid ${BORDER}`,
				borderRadius: 18,
				boxShadow: "0 30px 60px rgba(0,0,0,0.55)",
				overflow: "hidden",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "12px 18px",
					borderBottom: `1px solid ${BORDER}`,
					fontSize: 15,
					color: MUTED,
				}}
			>
				<span>{ORG.portal}</span>
				<span
					style={{
						padding: "3px 10px",
						borderRadius: 999,
						backgroundColor: "#3a2c14",
						color: PRIMARY,
						fontSize: 14,
					}}
				>
					Public portal
				</span>
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px 18px 18px" }}>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 8,
							padding: "4px 10px",
							border: `1px solid ${BORDER}`,
							borderRadius: 8,
							fontSize: 15,
							color: FG,
						}}
					>
						<StatusDot status="in-progress" size={16} /> In progress
					</div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 6,
							padding: "4px 10px",
							border: `1px solid ${BORDER}`,
							borderRadius: 8,
							fontSize: 15,
							color: FG,
						}}
					>
						<VoteArrow size={11} /> {SHOWN_VOTES}
					</div>
				</div>
				<span style={{ fontSize: 22, fontWeight: 700, color: FG }}>{FEATURED_TASK.title}</span>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 6,
						paddingTop: 12,
						borderTop: `1px solid ${BORDER}`,
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15 }}>
						<Avatar initials={PEOPLE.will.initials} color={PEOPLE.will.color} size={24} />
						<span style={{ color: FG, fontWeight: 500 }}>{PEOPLE.will.name}</span>
						<span
							style={{
								padding: "1px 7px",
								borderRadius: 5,
								backgroundColor: "#3a2c14",
								color: PRIMARY,
								fontSize: 12,
							}}
						>
							Team
						</span>
					</div>
					<span style={{ paddingLeft: 34, fontSize: 16, color: MUTED }}>Fixed, and it's coming in v2.4.</span>
				</div>
			</div>
		</div>
	);
}

function HomeCard() {
	return (
		<div
			style={{
				width: 1200,
				height: 630,
				display: "flex",
				position: "relative",
				backgroundColor: BG,
				fontFamily: "Inter",
				overflow: "hidden",
			}}
		>
			<TeamBoard />
			<PublicPost />
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					bottom: 0,
					width: 600,
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					padding: "64px 0 56px 72px",
				}}
			>
				<Brand />
				<div style={{ display: "flex", flexDirection: "column" }}>
					<span style={{ fontSize: 52, fontWeight: 700, color: FG, lineHeight: 1.06, letterSpacing: "-0.035em" }}>
						Your project tracker,
					</span>
					<span
						style={{ fontSize: 52, fontWeight: 700, color: PRIMARY, lineHeight: 1.06, letterSpacing: "-0.035em" }}
					>
						with a public side.
					</span>
					<span style={{ marginTop: 26, fontSize: 24, color: MUTED, lineHeight: 1.35 }}>
						Feedback, roadmap and changelog, built on the backlog your team already works in.
					</span>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 20, color: MUTED }}>
					<span style={{ color: FG, fontWeight: 500 }}>sayr.io</span>
					<span>·</span>
					<span>Source-available</span>
					<span>·</span>
					<span>EU-hosted</span>
				</div>
			</div>
		</div>
	);
}

function GenericCard({ title, subtitle }: { title: string; subtitle: string | null }) {
	return (
		<div
			style={{
				width: 1200,
				height: 630,
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				padding: "64px 80px 56px",
				backgroundColor: BG,
				fontFamily: "Inter",
			}}
		>
			<Brand />
			<div style={{ display: "flex", flexDirection: "column" }}>
				<span
					style={{
						fontSize: 72,
						fontWeight: 700,
						color: FG,
						lineHeight: 1.06,
						letterSpacing: "-0.035em",
						maxWidth: 1040,
					}}
				>
					{truncate(title, 60)}
				</span>
				{subtitle && (
					<span style={{ marginTop: 24, fontSize: 32, color: MUTED, lineHeight: 1.3, maxWidth: 1000 }}>
						{truncate(subtitle, 110)}
					</span>
				)}
			</div>
			<div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 20, color: MUTED }}>
				<span style={{ color: FG, fontWeight: 500 }}>sayr.io</span>
				<span>·</span>
				<span>Project tracker with a public side</span>
			</div>
		</div>
	);
}

async function renderPng(element: ReactNode): Promise<Response> {
	const fonts = await getFonts();
	const svg = await satori(element, {
		width: 1200,
		height: 630,
		fonts: fonts.map(({ weight, data }) => ({ name: "Inter", data, weight, style: "normal" as const })),
	});
	const png = await sharp(Buffer.from(svg)).png().toBuffer();
	return new Response(new Uint8Array(png), {
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
				const template = url.searchParams.get("template");
				const title = url.searchParams.get("title") || "Sayr";
				const subtitle = url.searchParams.get("subtitle");

				try {
					return await renderPng(
						template === "home" ? <HomeCard /> : <GenericCard title={title} subtitle={subtitle} />
					);
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
