import type { Command } from "commander";
import { registerAssignCommand } from "./assign";
import { registerCreateCommand } from "./create";
import { registerLabelCommand } from "./label";
import { registerListCommand } from "./list";
import { registerUpdateCommand } from "./update";
import { registerViewCommand } from "./view";

export function registerTaskCommand(program: Command): void {
	const task = program.command("task").description("Create, read, and update tasks");
	registerCreateCommand(task);
	registerListCommand(task);
	registerViewCommand(task);
	registerUpdateCommand(task);
	registerLabelCommand(task);
	registerAssignCommand(task);
}
