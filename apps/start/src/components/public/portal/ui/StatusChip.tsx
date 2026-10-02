import StatusIcon from "@repo/ui/components/icons/status";
import { cn } from "@repo/ui/lib/utils";
import { statusConfig } from "@/components/tasks/shared/config";
import { getPortalStatus } from "@/lib/portal/status";

interface StatusChipProps {
  /** Internal task status (`backlog | todo | in-progress | done | canceled`); the label is the public wording. */
  status: string;
  className?: string;
}

/** The admin status icon and colour (`statusConfig`) with the public label (Open / Planned / In progress / Done / Won't do). */
export function StatusChip({ status, className }: StatusChipProps) {
  const key = status as keyof typeof statusConfig;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-xs border py-0.5 px-1 rounded-lg",
        statusConfig[key]?.className,
        className,
      )}
    >
      <StatusIcon
        status={key in statusConfig ? key : "backlog"}
        className="shrink-0"
      />
      {getPortalStatus(status).label}
    </span>
  );
}
