"use client";

import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Label } from "@repo/ui/components/label";
import {
  ComboBox,
  ComboBoxContent,
  ComboBoxEmpty,
  ComboBoxGroup,
  ComboBoxItem,
  ComboBoxList,
  ComboBoxSearch,
  ComboBoxTrigger,
} from "@repo/ui/components/tomui/combo-box-unified";
import { cn } from "@repo/ui/lib/utils";
import { IconCircleFilled, IconPlus, IconTag } from "@tabler/icons-react";
import { XIcon } from "lucide-react";

interface GlobalTaskLabelsProps {
  task: schema.TaskWithLabels;
  editable?: boolean;
  availableLabels?: Array<{ id: string; name: string; color?: string | null }>;
  onLabelsChange?: (labelIds: string[]) => void;
  customTrigger?: React.ReactNode;
  customChildren?: React.ReactNode;
  showLabel?: boolean;
  /** Compact mode shows colored dots with count instead of full labels */
  compact?: boolean;
  /** Maximum dots to show in compact mode before showing count (default: 3) */
  maxCompactDots?: number;
  className?: string;
}

export default function GlobalTaskLabels({
  task,
  editable = false,
  availableLabels = [],
  onLabelsChange,
  customTrigger,
  customChildren,
  showLabel = true,
  compact = false,
  maxCompactDots = 3,
  className,
}: GlobalTaskLabelsProps) {
  // Get current selected label IDs
  const currentLabelIds = task.labels?.map((label) => label.id) || [];
  const handleLabelsChange = (values: string[]) => {
    if (onLabelsChange) {
      onLabelsChange(values);
    }
  };

  // Compact view: show colored dots with count (stacked like avatars)
  const renderCompactLabels = () => {
    const labels = task.labels || [];
    if (labels.length === 0) {
      return null;
    }

    const visibleLabels = labels.slice(0, maxCompactDots);
    const remainingCount = labels.length - maxCompactDots;

    return (
      <div className={cn("flex items-center")}>
        <div className="flex -space-x-2">
          {visibleLabels.map((label) => (
            <div
              key={label.id}
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: label.color || "#cccccc" }}
            />
          ))}
        </div>
        {remainingCount > 0 && (
          <span className="text-xs text-muted-foreground ml-1">
            {labels.length}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {!customTrigger && showLabel && (
        <Label variant={"subheading"}>Labels</Label>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {compact ? (
            // Compact mode: dots + count, clicking opens dropdown
            <ComboBox
              values={currentLabelIds}
              onValuesChange={handleLabelsChange}
            >
              <ComboBoxTrigger
                disabled={!editable}
                className={cn(
                  "h-auto p-1 bg-transparent border-transparent",
                  compact &&
                    "bg-accent p-1 w-fit shrink-0 rounded-lg h-[26px]  border-transparent hover:bg-secondary",
                )}
              >
                {task.labels?.length > 0 ? (
                  renderCompactLabels()
                ) : (
                  <IconTag size={14} className="text-muted-foreground" />
                )}
              </ComboBoxTrigger>
              <ComboBoxContent className="">
                <ComboBoxSearch placeholder="Search labels..." />
                <ComboBoxList>
                  <ComboBoxEmpty>No labels found.</ComboBoxEmpty>
                  <ComboBoxGroup>
                    {availableLabels.map((label) => (
                      <ComboBoxItem
                        key={label.id}
                        value={label.id}
                        searchValue={label.name}
                      >
                        <span
                          className="h-2 w-2 flex-shrink-0 rounded-full mr-2"
                          style={{ backgroundColor: label.color || "#cccccc" }}
                        />
                        <span className="flex-1">{label.name}</span>
                      </ComboBoxItem>
                    ))}
                  </ComboBoxGroup>
                </ComboBoxList>
              </ComboBoxContent>
            </ComboBox>
          ) : (
            // Full mode: show all labels with names
            <>
              {customChildren
                ? customChildren
                : task.labels.map((label) => (
                    <RenderLabel
                      key={label.id}
                      label={label}
                      showRemove={editable}
                      onRemove={(labelId) => {
                        handleLabelsChange(
                          currentLabelIds.filter((id) => id !== labelId),
                        );
                      }}
                    />
                  ))}
              <ComboBox
                values={currentLabelIds}
                onValuesChange={handleLabelsChange}
              >
                {customTrigger ? (
                  // Wrap customTrigger in ComboBoxTrigger asChild so it opens the ComboBox
                  <ComboBoxTrigger asChild>{customTrigger}</ComboBoxTrigger>
                ) : (
                  <ComboBoxTrigger
                    disabled={!editable}
                    className="h-6 w-6 aspect-square p-0 justify-center"
                  >
                    <IconPlus size={14} />
                  </ComboBoxTrigger>
                )}
                <ComboBoxContent className="">
                  <ComboBoxSearch placeholder="Search labels..." />
                  <ComboBoxList>
                    <ComboBoxEmpty>No labels found.</ComboBoxEmpty>
                    <ComboBoxGroup>
                      {availableLabels.map((label) => (
                        <ComboBoxItem
                          key={label.id}
                          value={label.id}
                          searchValue={label.name}
                        >
                          <span
                            className="h-2 w-2 flex-shrink-0 rounded-full mr-2"
                            style={{
                              backgroundColor: label.color || "#cccccc",
                            }}
                          />
                          <span className="flex-1">{label.name}</span>
                        </ComboBoxItem>
                      ))}
                    </ComboBoxGroup>
                  </ComboBoxList>
                </ComboBoxContent>
              </ComboBox>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface RenderLabelProps {
  label: { id: string; name: string; color?: string | null };
  showRemove?: boolean;
  onRemove?: (labelId: string) => void;
  onClick?: (e: React.MouseEvent, labelId: string) => void;
  className?: string;
}

export function RenderLabel({
  label,
  showRemove = false,
  onRemove,
  onClick,
  className = "",
}: RenderLabelProps) {
  return (
    <Badge
      key={label.id}
      variant="secondary"
      className={cn(
        "flex items-center justify-center gap-1 max-w-32 bg-accent text-xs h-5 border border-border rounded-2xl truncate group/label cursor-pointer w-fit relative peer ps-5",
        showRemove && "pe-5",
        className,
      )}
      // style={{
      // 	backgroundColor: label.color ? getHslaWithOpacity(label.color, 0.1) : "var(--muted)",
      // 	borderColor: label.color ? getHslaWithOpacity(label.color, 0.5) : "var(--border)",
      // }}
      onClick={onClick ? (e) => onClick(e, label.id) : undefined}
    >
      <div className="shrink-0 absolute inset-y-0 flex items-center justify-center start-0 ps-1">
        <IconCircleFilled
          size={12}
          style={{
            color: label.color || "var(--foreground)",
          }}
        />
      </div>
      <span className="truncate">{label.name}</span>
      {showRemove && onRemove && (
        <div className="shrink-0 absolute inset-y-0 flex items-center justify-center end-0 pe-1">
          <XIcon
            size={12}
            className="cursor-pointer hover:bg-muted rounded-sm shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(label.id);
            }}
          />
        </div>
      )}
    </Badge>
  );
}
