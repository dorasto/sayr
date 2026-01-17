import { defineConfig } from "tsup";

export default defineConfig([
    {
        entry: ["src/index.ts"],
        format: ["esm", "cjs"],
        dts: true,
        sourcemap: true,
        clean: true
    },
    {
        entry: ["src/react/index.ts"],
        format: ["esm", "cjs"],
        dts: true,
        outDir: "dist/react",
        sourcemap: true
    }
]);