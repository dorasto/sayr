import { generateFiles } from "fumadocs-openapi";
import { openapi } from "../src/lib/openapi.ts"; // relative import, not @/ alias — this runs outside Vite

void generateFiles({
	input: openapi,
	output: "./content/docs/api/reference",
	per: "operation",
	groupBy: "tag",
	includeDescription: true,
	meta: true,
});
