#!/usr/bin/env node
// Diffs every real directory under apps/* and packages/* (real = has a
// package.json) against the raw text of AGENTS.md, and lists anything not
// mentioned anywhere in the file. Plain substring check, not a markdown-table
// parser — it doesn't care how the tables are formatted, it just needs the
// path or package name to appear somewhere in the file.
//
// Run on request, not a CI gate. See the agent-docs-maintenance skill.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const agentsMd = readFileSync(join(repoRoot, "AGENTS.md"), "utf8");

function realDirs(groupDir) {
	const base = join(repoRoot, groupDir);
	if (!existsSync(base)) return [];
	return readdirSync(base, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => join(groupDir, d.name))
		.filter((p) => existsSync(join(repoRoot, p, "package.json")));
}

const targets = [...realDirs("apps"), ...realDirs("packages")];

const missing = [];
for (const path of targets) {
	const pkgJson = JSON.parse(readFileSync(join(repoRoot, path, "package.json"), "utf8"));
	const name = pkgJson.name ?? "";
	const dirName = path.split("/").pop();
	// Mentioned if either the package.json "name" or the bare directory name
	// (with or without the leading "apps/"/"packages/") appears anywhere.
	const mentioned =
		(name && agentsMd.includes(name)) || agentsMd.includes(path) || agentsMd.includes(`\`${dirName}\``);
	if (!mentioned) missing.push({ path, name });
}

if (missing.length === 0) {
	console.log("AGENTS.md mentions every apps/* and packages/* directory with a package.json. ✓");
	process.exit(0);
}

console.log(`AGENTS.md is missing ${missing.length} director${missing.length === 1 ? "y" : "ies"}:\n`);
for (const { path, name } of missing) {
	console.log(`  - ${path}${name ? ` (${name})` : ""}`);
}
console.log(
	"\nAdd a row to the relevant table in AGENTS.md's Repository Overview section — read the package's entry point, don't guess a description from the name alone."
);
process.exit(1);
