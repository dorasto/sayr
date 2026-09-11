import type { Command } from "commander";
import { registerCreateCommand } from "./create";
import { registerDeleteCommand } from "./delete";
import { registerUpdateCommand } from "./update";

export function registerCommentCommand(program: Command): void {
	const comment = program.command("comment").description("Create, edit, and delete task comments");
	registerCreateCommand(comment);
	registerUpdateCommand(comment);
	registerDeleteCommand(comment);
}
