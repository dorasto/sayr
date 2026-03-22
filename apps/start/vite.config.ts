import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
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
    rollupOptions: {
      external: (id) => /^(@resvg\/resvg-js|sharp|satori)/.test(id),
    },
  },
  // Prevent Vite from trying to bundle native .node binaries (e.g. @resvg/resvg-js)
  // These are server-only and must be loaded by Node/Bun at runtime, not bundled by esbuild.
  optimizeDeps: {
    exclude: ["@resvg/resvg-js", "satori", "sharp"],
  },
  ssr: {
    external: ["@resvg/resvg-js", "satori", "sharp"],
    noExternal: [],
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
              console.log("[Proxy]", req.method, req.url, "→", `http://localhost:5468${req.url?.replace(/^\/backend-api/, "/api")}`);
            });
          },
        },
      }
      : undefined,
  },
  plugins: [
    devtools(),
    !isDev &&
    nitro({
      // Treat native-binary packages as external in Nitro's server bundle.
      // These contain .node files that Rollup cannot parse — they must be
      // resolved at runtime by Node, not bundled.
      traceDeps: ["@resvg/resvg-js", "satori"],
      rollupConfig: {
        plugins: [
          // Intercept .node native binary imports before any other plugin
          // (e.g. nitro:externals, rollup-plugin-inject) tries to parse them.
          // @resvg/resvg-js/js-binding.js does static require() calls for
          // platform-specific sub-packages (@resvg/resvg-js-linux-x64-musl etc.)
          // that resolve to raw ELF binaries — marking them external here
          // prevents Rollup from attempting to parse the binary as JavaScript.
          {
            name: "native-node-externals",
            resolveId(id: string) {
              if (id.endsWith(".node") || /^@resvg\/resvg-js/.test(id)) {
                return { id, external: true };
              }
            },
          },
        ],
      },
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
