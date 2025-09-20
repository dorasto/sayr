import { Badge } from "@repo/components/ui/badge"
import type { TaskStatus } from "@repo/lib/types"

interface TaskStatusProps {
  status: TaskStatus
}

const statusConfig = {
  backlog: {
    label: "Backlog",
    variant: "secondary" as const,
    icon: "○",
  },
  todo: {
    label: "Todo",
    variant: "secondary" as const,
    icon: "○",
  },
  "in-progress": {
    label: "In Progress",
    variant: "default" as const,
    icon: "◐",
  },
  done: {
    label: "Done",
    variant: "secondary" as const,
    icon: "●",
  },
  canceled: {
    label: "Canceled",
    variant: "outline" as const,
    icon: "✕",
  },
}

export function TaskStatusComponent({ status }: TaskStatusProps) {
  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <span>{config.icon}</span>
      {config.label}
    </Badge>
  )
}
