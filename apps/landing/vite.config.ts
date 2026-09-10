import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import mdx from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const isDev = process.env.NODE_ENV !== "production";

// Load .env files so non-VITE_ vars (SAYR_EDITION, APP_ENV) are available in the define block.
// Vite only auto-exposes VITE_* prefixed vars; loadEnv with "" prefix loads all of them.
const env = loadEnv(isDev ? "development" : "production", process.cwd(), "");

const config = defineConfig({
	build: {
		minify: false,
		sourcemap: true,
		target: "esnext",
	},
	define: {
		"import.meta.env.VITE_APP_ENV": JSON.stringify(env.APP_ENV ?? "development"),
		"import.meta.env.VITE_APP_VERSION": JSON.stringify(env.VITE_APP_VERSION ?? "localhost"),
		"import.meta.env.VITE_SAYR_EDITION": JSON.stringify(env.SAYR_EDITION_BAKED ?? env.SAYR_EDITION ?? "community"),
	},
	resolve: {
		alias: {
			collections: fileURLToPath(new URL("./.source", import.meta.url)),
		},
	},
	server: {
		allowedHosts: true,
	},
	ssr: {
		noExternal: isDev ? [] : true,
		target: "node",
	},
	plugins: [
		mdx(),
		devtools(),
		!isDev &&
			nitro({
				exportConditions: ["import", "module", "default"],
				// @ts-expect-error - externals.inline is not in NitroPluginConfig types but exists at runtime
				externals: {
					inline: ["@tabler/icons-react"],
				},
			}),

		// this is the plugin that enables path aliases
		viteTsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
