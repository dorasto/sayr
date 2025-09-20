import { Badge } from "@repo/components/ui/badge"
import type { TaskPriority } from "@repo/lib/types"

interface TaskPriorityProps {
  priority: TaskPriority
}

const priorityConfig = {
  low: {
    label: "Low",
    variant: "secondary" as const,
    icon: "↓",
  },
  medium: {
    label: "Medium",
    variant: "default" as const,
    icon: "→",
  },
  high: {
    label: "High",
    variant: "destructive" as const,
    icon: "↑",
  },
}

export function TaskPriorityComponent({ priority }: TaskPriorityProps) {
  const config = priorityConfig[priority]

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <span>{config.icon}</span>
      {config.label}
    </Badge>
  )
}
