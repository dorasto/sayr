import { IconBell } from "@tabler/icons-react";

export function NotificationEmptyState() {
	return (
		<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
			<IconBell className="size-8 mb-2 opacity-50" />
			<p className="text-sm">No notifications</p>
			<p className="text-xs mt-1">You're all caught up</p>
		</div>
	);
}
