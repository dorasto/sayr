import type { Command } from "commander";
import { registerReleaseCommentCommand } from "./comment";
import { registerCreateCommand } from "./create";
import { registerDeleteCommand } from "./delete";
import { registerLabelCommand } from "./label";
import { registerListCommand } from "./list";
import { registerReleasePrCommand } from "./pr";
import { registerPublishCommand } from "./publish";
import { registerReleaseStatusUpdateCommand } from "./status-update";
import { registerUpdateCommand } from "./update";
import { registerViewCommand } from "./view";

export function registerReleasesCommand(program: Command): void {
	const releases = program
		.command("releases")
		.description("View and manage an organization's releases, their status updates, comments, and pull requests");
	registerListCommand(releases);
	registerViewCommand(releases);
	registerCreateCommand(releases);
	registerUpdateCommand(releases);
	registerPublishCommand(releases);
	registerDeleteCommand(releases);
	registerLabelCommand(releases);
	registerReleaseStatusUpdateCommand(releases);
	registerReleaseCommentCommand(releases);
	registerReleasePrCommand(releases);
}
