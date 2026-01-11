import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
  define: {
    "import.meta.env.VITE_APP_ENV": JSON.stringify(
      process.env.APP_ENV ?? "development",
    ),
    "VITE_APP_ENV": JSON.stringify(
      process.env.APP_ENV ?? "development",
    ),
  },
  plugins: [
    devtools(),
    nitro({
      externals: {
        inline: ["@tabler/icons-react", "lucide-react"],
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
