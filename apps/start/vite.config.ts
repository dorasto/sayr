import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { sentryTanstackStart } from "@sentry/tanstackstart-react";

const config = defineConfig({
  build: {
    minify: false,
    sourcemap: true,
  },
  define: {
    "import.meta.env.VITE_APP_ENV": JSON.stringify(
      process.env.APP_ENV ?? "development",
    ),
  },
  plugins: [
    devtools(),
    // @ts-ignore - externals is valid in runtime Nitro config
    nitro({
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
        // Add Document-Policy header for Sentry browser profiling
        "/**": {
          headers: {
            "Document-Policy": "js-profiling",
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
    sentryTanstackStart({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        assets: [".output/**/*.js", ".output/**/*.mjs"],
        filesToDeleteAfterUpload: [".output/**/*.js.map", ".output/**/*.mjs.map"],
      },
      release: {
        name: process.env.VITE_SENTRY_RELEASE || `${process.env.npm_package_name}@${process.env.npm_package_version}`,
      },
      debug: true, // Enable debug logging to see if source maps are being uploaded
    }),
  ],
});

export default config;
