import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import posthog from "@posthog/rollup-plugin";

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
  optimizeDeps: {
    include: ["tslib"],
  },
  define: {
    "import.meta.env.VITE_APP_ENV": JSON.stringify(
      env.APP_ENV ?? "development",
    ),
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(
      env.VITE_APP_VERSION ?? "localhost",
    ),
    "import.meta.env.VITE_SAYR_EDITION": JSON.stringify(
      env.SAYR_EDITION_BAKED ?? env.SAYR_EDITION ?? "community",
    ),
  },
  // Use Vite's built-in proxy in development (avoids nitro caching/hydration issues)
  // See: https://github.com/TanStack/router/issues/6556
  server: {
    allowedHosts: true,
    proxy: isDev
      ? {
          // /backend-api/internal/v1/... → http://localhost:5468/api/internal/v1/...
          "/backend-api": {
            target: "http://localhost:5468",
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/backend-api/, "/api"),
            configure: (proxy) => {
              proxy.on("error", (err) => {
                console.log("[Proxy Error]", err);
              });
              proxy.on("proxyReq", (_proxyReq, req) => {
                console.log(
                  "[Proxy]",
                  req.method,
                  req.url,
                  "→",
                  `http://localhost:5468${req.url?.replace(/^\/backend-api/, "/api")}`,
                );
              });
            },
          },
        }
      : undefined,
  },
  ssr: {
    noExternal: isDev ? [] : true,
    target: "node",
    // shiki uses onig.wasm which cannot be bundled — keep it external
    // sharp is a native module — keep it external
    external: ["shiki", "sharp"],
  },
  plugins: [
    devtools(),
    !isDev &&
      nitro({
        exportConditions: ["import", "module", "default"],
        // @ts-expect-error - externals.inline is not in NitroPluginConfig types but exists at runtime
        externals: {
          inline: ["@tabler/icons-react", "lucide-react"],
        },
        routeRules: {
          "/api/auth/**": {}, // local auth
          "/api/image-preview/**": {},
          // ✅ proxy ONLY backend-api
          "/backend-api/**": {
            proxy: {
              to: "http://localhost:5468/api/**",
            },
          },
        },
      }),

    // PostHog Rollup plugin: uploads source maps during CI/CD build (as per PostHog docs).
    // Only runs when a valid token is present — skipped silently for local builds.
    !isDev &&
      !!process.env.POSTHOG_CLI_TOKEN?.startsWith("phx_") &&
      posthog({
        personalApiKey: process.env.POSTHOG_CLI_TOKEN,
        projectId: process.env.POSTHOG_CLI_ENV_ID || "",
        host: process.env.VITE_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        sourcemaps: {
          enabled: true,
          releaseName: "sayr-start",
          // Version priority: Zerops appVersionName → git short SHA → timestamp fallback
          releaseVersion:
            process.env.appVersionName ||
            (() => {
              try {
                const { execSync } = require("child_process");
                return execSync("git rev-parse --short HEAD").toString().trim();
              } catch {
                return `dev-${Date.now()}`;
              }
            })(),
          deleteAfterUpload: false,
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
