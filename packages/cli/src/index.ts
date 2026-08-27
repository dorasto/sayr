#!/usr/bin/env node
import { Command } from "commander";
import { registerCommentCommand } from "./commands/comment";
import { registerConfigCommand } from "./commands/config";
import { registerLoginCommand } from "./commands/login";
import { registerLogoutCommand } from "./commands/logout";
import { registerOrgsCommand } from "./commands/orgs";
import { registerTaskCommand } from "./commands/task";
import { registerWhoamiCommand } from "./commands/whoami";
import { printError } from "./lib/output";

const program = new Command();

program.name("sayr").description("Sayr.io command-line interface").version("0.0.1");

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
