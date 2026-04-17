import type { schema } from "@repo/database";
import { ReleaseFieldToolbar } from "./release-field-toolbar";

interface ReleaseInfoProps {
	release: schema.ReleaseWithTasks;
	editable?: boolean;
}

export function ReleaseInfo({ release, editable = true }: ReleaseInfoProps) {
	return <ReleaseFieldToolbar release={release} variant="sidebar" editable={editable} />;
}
