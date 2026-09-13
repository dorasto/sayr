import type { Command } from "commander";
import { registerCreateCommand } from "./create";
import { registerDeleteCommand } from "./delete";
import { registerListCommand } from "./list";
import { registerRepliesCommand } from "./replies";
import { registerUpdateCommand } from "./update";

export function registerCommentCommand(program: Command): void {
	const comment = program.command("comment").description("List, create, edit, and delete task comments");
	registerListCommand(comment);
	registerRepliesCommand(comment);
	registerCreateCommand(comment);
	registerUpdateCommand(comment);
	registerDeleteCommand(comment);
}
