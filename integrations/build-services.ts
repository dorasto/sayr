import { readdirSync } from "fs";
import { join } from "path";
import { $ } from "bun";

const base = join(process.cwd(), "services");

const dirs = readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(base, d.name));

for (const dir of dirs) {
    console.log(`📦 Building service: ${dir}`);
    await $`bun run build`.cwd(dir);
}

console.log("✅ All services built");