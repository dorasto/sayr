import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
  build: {
    minify: false,
    sourcemap: true,
  },
  define: {
    "import.meta.env.VITE_APP_ENV": JSON.stringify(
      process.env.APP_ENV ?? "development",
    ),
    "import.meta.env.VITE_SAYR_CLOUD": JSON.stringify(
      process.env.SAYR_CLOUD ?? "false",
    ),
  },
  plugins: [
    devtools(),
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
