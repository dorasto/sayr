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
    label: "mentioned you on this task",
    icon: (cls) => <IconBell className={cls} />,
  },
  status_change: {
    label: "updated the task status",
    icon: (cls) => <IconStatusChange className={cls} />,
  },
  priority_change: {
    label: "updated the task priority",
    icon: (cls) => <IconUrgent className={cls} />,
  },
  assignee_added: {
    label: "assigned this task to you",
    icon: (cls) => <IconUserPlus className={cls} />,
  },
  assignee_removed: {
    label: "unassigned you",
    icon: (cls) => <IconUserMinus className={cls} />,
  },
  comment: {
    label: "commented on this task",
    icon: (cls) => <IconMessage className={cls} />,
  },
};
