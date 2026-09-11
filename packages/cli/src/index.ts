#!/usr/bin/env node
import { createRequire } from "node:module";
import { Command } from "commander";
import { registerCommentCommand } from "./commands/comment";
import { registerConfigCommand } from "./commands/config";
import { registerLoginCommand } from "./commands/login";
import { registerLogoutCommand } from "./commands/logout";
import { registerOrgsCommand } from "./commands/orgs";
import { registerTaskCommand } from "./commands/task";
import { registerWhoamiCommand } from "./commands/whoami";
import { printError } from "./lib/output";

// Read the real version from package.json (one level up from both src/ in dev
// and dist/ once built) instead of hardcoding a string here that would drift
// from whatever the publish workflow actually ships. createRequire rather
// than a JSON import assertion — the latter's syntax differs across the
// Node 18/20/22 range this CLI's engines field supports.
const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

const program = new Command();

program.name("sayr").description("Sayr.io command-line interface").version(version);

registerLoginCommand(program);
registerLogoutCommand(program);
registerWhoamiCommand(program);
registerConfigCommand(program);
registerOrgsCommand(program);
registerTaskCommand(program);
registerCommentCommand(program);

program.parseAsync(process.argv).catch((err) => {
	printError(err);
	process.exitCode = 1;
});
