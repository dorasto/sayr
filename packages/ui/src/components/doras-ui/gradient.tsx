import React from "react";
import { motion } from "motion/react";
import { cn } from "@repo/ui/lib/utils";

/**
 * A single gradient color stop. Either a plain CSS color, or a color plus an opacity (0-1) —
 * useful when the color comes from a theme token (e.g. `var(--chart-1)`) that's already fully
 * opaque, so a trailing `/50%` on the value itself won't do anything.
 */
export type GradientColor = string | { color: string; opacity: number };

/**
 * Named gradient presets, each 4 color stops (bottom-left, top-right, bottom-right, top-left).
 * Theme-token presets reference CSS custom properties from `globals.css`, so they automatically
 * track the active theme (light/dark) instead of being hardcoded hex values. Pass an explicit
 * `colors` array on `BackgroundGradient` for anything not covered here.
 */
export const GRADIENT_PRESETS = {
  /** Brand amber, pulled from the primary/chart scale — matches buttons, links, and accents. */
  primary: [
    { color: "var(--chart-1)", opacity: 0.5 },
    { color: "var(--chart-2)", opacity: 0.5 },
    { color: "var(--chart-3)", opacity: 0.5 },
    { color: "var(--chart-4)", opacity: 0.5 },
  ],
  /** Success green blending into the brand amber — for positive/completed states. */
  success: [
    { color: "var(--success)", opacity: 0.5 },
    { color: "var(--chart-2)", opacity: 0.5 },
    { color: "var(--primary)", opacity: 0.5 },
    { color: "var(--chart-4)", opacity: 0.5 },
  ],
  /** Low-key neutral glow for less prominent surfaces. */
  muted: [
    "var(--muted-foreground)",
    "var(--border)",
    "var(--accent)",
    "var(--secondary)",
  ],
  /** Original multicolor look — teal/purple/yellow/blue. Not theme-aware, use sparingly. */
  rainbow: ["#00ccb1", "#7b61ff", "#ffc414", "#1ca0fb"],
} satisfies Record<
  string,
  [GradientColor, GradientColor, GradientColor, GradientColor]
>;

export type GradientPreset = keyof typeof GRADIENT_PRESETS;

/**
 * Named spread presets — how far the glow visually bleeds past the card's edges. The gradient
 * itself always fills its box (`circle farthest-side`); what actually reads as "reach" is the
 * blur radius on the outer glow layer (blur spreads pixels outward past the element's own
 * bounds) combined with that layer's opacity, which controls how far the glow stays visible
 * before fading below the threshold where you can see it. `full` reproduces the original look.
 */
export const GRADIENT_SPREADS = {
  subtle: { blur: 8, opacity: 0.35 },
  soft: { blur: 14, opacity: 0.6 },
  medium: { blur: 20, opacity: 0.8 },
  full: { blur: 24, opacity: 1 },
} as const;

export type GradientSpread =
  | keyof typeof GRADIENT_SPREADS
  | { blur: number; opacity: number };

function resolveSpread(spread: GradientSpread) {
  return typeof spread === "string" ? GRADIENT_SPREADS[spread] : spread;
}

/** Resolves a stop to a CSS color, mixing in transparency via `color-mix()` when an opacity is given. */
function resolveColorStop(stop: GradientColor) {
  if (typeof stop === "string") return stop;
  const { color, opacity } = stop;
  return `color-mix(in oklch, ${color} ${Math.round(opacity * 100)}%, transparent)`;
}

function buildGradientImage([bottomLeft, topRight, bottomRight, topLeft]: [
  GradientColor,
  GradientColor,
  GradientColor,
  GradientColor,
]) {
  const [bl, tr, br, tl] = [bottomLeft, topRight, bottomRight, topLeft].map(
    resolveColorStop,
  );
  return [
    `radial-gradient(circle farthest-side at 0 100%, ${bl}, transparent)`,
    `radial-gradient(circle farthest-side at 100% 0, ${tr}, transparent)`,
    `radial-gradient(circle farthest-side at 100% 100%, ${br}, transparent)`,
    `radial-gradient(circle farthest-side at 0 0, ${tl}, transparent)`,
  ].join(", ");
}

interface BackgroundGradientProps {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  animate?: boolean;
  /** Named preset built from theme CSS variables — see `GRADIENT_PRESETS`. Ignored if `colors` is set. */
  preset?: GradientPreset;
  /**
   * Four explicit color stops (bottom-left, top-right, bottom-right, top-left), overriding `preset`.
   * Accepts any valid CSS color, e.g. `"var(--primary)"` or `"#7b61ff"`, or `{ color, opacity }` to
   * apply an opacity (0-1) on top of it — needed for theme tokens, which are already fully opaque.
   */
  colors?: [GradientColor, GradientColor, GradientColor, GradientColor];
  /**
   * How far the glow bleeds past the card's edges, as a named preset (`GRADIENT_SPREADS`) or a
   * raw `{ blur, opacity }` override. Defaults to `"full"`.
   */
  spread?: GradientSpread;
}

export const BackgroundGradient = ({
  children,
  className,
  containerClassName,
  animate = true,
  preset = "primary",
  colors,
  spread = "full",
}: BackgroundGradientProps) => {
  const gradientImage = buildGradientImage(colors ?? GRADIENT_PRESETS[preset]);
  const { blur, opacity } = resolveSpread(spread);

  const variants = {
    initial: {
      backgroundPosition: "0 50%",
    },
    animate: {
      backgroundPosition: ["0, 50%", "100% 50%", "0 50%"],
    },
  };

  const glowStyle = {
    backgroundImage: gradientImage,
    backgroundSize: animate ? "400% 400%" : undefined,
  };

  return (
    <div className={cn("relative p-0.5", containerClassName)}>
      <motion.div
        variants={animate ? variants : undefined}
        initial={animate ? "initial" : undefined}
        animate={animate ? "animate" : undefined}
        transition={
          animate
            ? {
                duration: 5,
                repeat: Infinity,
                repeatType: "reverse",
              }
            : undefined
        }
        style={{ ...glowStyle, filter: `blur(${blur}px)`, opacity }}
        className="absolute inset-0 rounded-xl z-[1] will-change-transform"
      />
      <motion.div
        variants={animate ? variants : undefined}
        initial={animate ? "initial" : undefined}
        animate={animate ? "animate" : undefined}
        transition={
          animate
            ? {
                duration: 5,
                repeat: Infinity,
                repeatType: "reverse",
              }
            : undefined
        }
        style={glowStyle}
        className="absolute inset-0 rounded-xl z-[1] will-change-transform"
      />

      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  );
};
