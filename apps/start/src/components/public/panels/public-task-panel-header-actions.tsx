import { IconArrowUpRight } from "@tabler/icons-react";
import { usePublicTask } from "@/contexts/ContextPublicOrgTask";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";

/** "Open internally" shortcut for org members, rendered in the drawer's native header next to the close button. */
export function PublicTaskPanelHeaderActions() {
	const { organization } = usePublicOrganizationLayout();
	const { task, isMember } = usePublicTask();

	if (!isMember) return null;

	return (
		<a
			href={`${import.meta.env.VITE_URL_ROOT}/${organization.id}/tasks/${task.shortId}`}
			target="_blank"
			rel="noopener noreferrer"
			className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-muted-foreground text-xs transition-colors hover:bg-accent focus-visible:bg-accent hover:text-foreground focus-visible:text-foreground"
		>
			<IconArrowUpRight aria-hidden className="size-3.5" />
			Open internally
		</a>
	);
}
