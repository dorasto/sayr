import {
	IconBell,
	IconMessage,
	IconStatusChange,
	IconUrgent,
	IconUserMinus,
	IconUserPlus,
} from "@tabler/icons-react";

export const notificationTypeConfig: Record<
	string,
	{ label: string; icon: (className: string) => React.ReactNode }
> = {
	mention: {
		label: "mentioned you",
		icon: (cls) => <IconBell className={cls} />,
	},
	status_change: {
		label: "changed status",
		icon: (cls) => <IconStatusChange className={cls} />,
	},
	priority_change: {
		label: "changed priority",
		icon: (cls) => <IconUrgent className={cls} />,
	},
	assignee_added: {
		label: "assigned you",
		icon: (cls) => <IconUserPlus className={cls} />,
	},
	assignee_removed: {
		label: "unassigned you",
		icon: (cls) => <IconUserMinus className={cls} />,
	},
	comment: {
		label: "commented",
		icon: (cls) => <IconMessage className={cls} />,
	},
};