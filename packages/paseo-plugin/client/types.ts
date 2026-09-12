import type { PluginHostProps, PluginSurfaceProps } from "@getpaseo/plugin/client";

/**
 * Shared prop-type aliases used across every `client/` component — one place
 * instead of every file redeclaring `type Theme = PluginHostProps["theme"]`.
 */
export type Theme = PluginHostProps["theme"];
export type Layout = PluginHostProps["layout"];
export type Navigation = PluginSurfaceProps["navigation"];
