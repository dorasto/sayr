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
    if (
      !mime.includes("png") &&
      !mime.includes("jpeg") &&
      !mime.includes("jpg")
    ) {
      const pngBuf = await sharp(buf).png().toBuffer();
      return `data:image/png;base64,${pngBuf.toString("base64")}`;
    }

    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// Truncate text so it doesn't overflow the card
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

async function generateOgImage(params: {
  title: string;
  subtitle: string | null;
  meta: string | null;
  logoUrl: string | null;
}): Promise<Response> {
  const { title, subtitle, meta, logoUrl } = params;

  const [fontData, logoDataUri] = await Promise.all([
    getFont(),
    logoUrl ? toDataUri(logoUrl) : Promise.resolve(null),
  ]);

  // Brand colours (hex equivalents of the Sayr design system dark theme)
  const BG = "#18181b"; // dark.background ≈ oklch(0.2046 0 0)
  const SURFACE = "#27272a"; // dark.card ≈ oklch(0.2686 0 0)
  const PRIMARY = "#e8a048"; // primary ≈ oklch(0.7686 0.1647 70.0804)
  const FG = "#ebebeb"; // dark.foreground ≈ oklch(0.9219 0 0)
  const MUTED = "#a1a1aa"; // dark.muted-foreground ≈ oklch(0.7155 0 0)
  const BORDER = "#3f3f46";

  const svg = await satori(
    React.createElement(
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
      // Top accent bar
      React.createElement("div", {
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: PRIMARY,
          display: "flex",
        },
      }),
      // Main content area
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
        // Org row: logo + meta name
        (logoDataUri || meta) &&
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 40,
              },
            },
            logoDataUri &&
              React.createElement(
                "div",
                {
                  style: {
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: SURFACE,
                    border: `2px solid ${BORDER}`,
                  },
                },
                React.createElement("img", {
                  src: logoDataUri,
                  width: 52,
                  height: 52,
                  alt: "",
                  style: { objectFit: "cover", width: "100%", height: "100%" },
                }),
              ),
            meta &&
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 24,
                    color: MUTED,
                    fontWeight: 400,
                    letterSpacing: "-0.01em",
                  },
                },
                truncate(meta, 40),
              ),
          ),
        // Main title
        React.createElement(
          "div",
          {
            style: {
              fontSize: subtitle ? 64 : 72,
              fontWeight: 700,
              color: FG,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              maxWidth: 960,
              display: "flex",
              flexWrap: "wrap",
            },
          },
          truncate(title, 80),
        ),
        // Subtitle
        subtitle &&
          React.createElement(
            "div",
            {
              style: {
                marginTop: 24,
                fontSize: 32,
                color: MUTED,
                fontWeight: 400,
                letterSpacing: "-0.01em",
                display: "flex",
              },
            },
            truncate(subtitle, 60),
          ),
      ),
      // Footer bar
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 80px 48px 80px",
          },
        },
        // Decorative pill
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
        // Sayr wordmark
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "baseline",
              gap: 2,
            },
          },
          React.createElement(
            "span",
            {
              style: {
                fontSize: 32,
                fontWeight: 700,
                color: FG,
                letterSpacing: "-0.03em",
              },
            },
            "Sayr",
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 32,
                fontWeight: 700,
                color: PRIMARY,
                letterSpacing: "-0.03em",
              },
            },
            ".",
          ),
        ),
      ),
    ),
    {
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
    },
  );

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
        const title = url.searchParams.get("title") || "Sayr";
        const subtitle = url.searchParams.get("subtitle");
        const meta = url.searchParams.get("meta");
        const logoUrl = url.searchParams.get("logo");

        try {
          return await generateOgImage({ title, subtitle, meta, logoUrl });
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
