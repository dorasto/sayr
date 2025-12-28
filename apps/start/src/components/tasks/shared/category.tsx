"use client";

import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Label } from "@repo/ui/components/label";
import {
  ComboBox,
  ComboBoxContent,
  ComboBoxEmpty,
  ComboBoxGroup,
  ComboBoxIcon,
  ComboBoxItem,
  ComboBoxList,
  ComboBoxSearch,
  ComboBoxTrigger,
  ComboBoxValue,
} from "@repo/ui/components/tomui/combo-box-unified";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { cn } from "@repo/ui/lib/utils";
import { extractHslValues } from "@repo/util";
import { IconCategory } from "@tabler/icons-react";
import { XIcon } from "lucide-react";
import RenderIcon from "@/components/generic/RenderIcon";
import { updateTaskAction } from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import { Button } from "@repo/ui/components/button";
import { Link } from "@tanstack/react-router";
import { InlineLabel } from "./inlinelabel";

interface GlobalTaskCategoryProps {
  task: schema.TaskWithLabels;
  editable?: boolean;
  onChange?: (categoryId: string) => void;

  // Optional internal logic for linked state management with task list
  tasks?: schema.TaskWithLabels[];
  setTasks?: (newValue: schema.TaskWithLabels[]) => void;
  setSelectedTask?: (newValue: schema.TaskWithLabels | null) => void;

  useInternalLogic?: boolean;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  customTrigger?: React.ReactNode;
  categories: schema.categoryType[];
  showLabel?: boolean;
  showChevron?: boolean;
  className?: string;
}

export default function GlobalTaskCategory({
  task,
  editable = false,
  onChange,
  tasks = [],
  setTasks,
  setSelectedTask,
  useInternalLogic = false,
  open,
  setOpen,
  customTrigger,
  categories,
  showLabel = true,
  showChevron = true,
  className,
}: GlobalTaskCategoryProps) {
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
  const { runWithToast } = useToastAction();

  const handleCategoryChange = async (categoryId: string | null) => {
    // if (!categoryId) return;

    // Always call onChange first
    if (onChange) {
      onChange(categoryId || "");
    }

    if (useInternalLogic && tasks && setTasks && setSelectedTask) {
      // Find the category object for display
      const selectedCategory =
        categories.find((c) => c.id === categoryId)?.id || "";

      // Optimistic UI update
      const updatedTasks = tasks.map((t) =>
        t.id === task.id ? { ...task, category: selectedCategory } : t,
      );
      setTasks(updatedTasks);
      if (task) {
        setSelectedTask({ ...task, category: selectedCategory });
      }

      // Server update
      const data = await runWithToast(
        "update-task-category",
        {
          loading: {
            title: "Updating task...",
            description: "Updating your task category...",
          },
          success: {
            title: "Task updated",
            description: "The category has been saved successfully.",
          },
          error: {
            title: "Save failed",
            description:
              "Your change is visible, but couldn't be saved. Please try again.",
          },
        },
        () =>
          updateTaskAction(
            task.organizationId,
            task.id,
            { category: categoryId }, // <-- Make sure your API expects categoryId or category
            wsClientId,
          ),
      );

      if (data?.success && data.data) {
        const finalTasks = tasks.map((t) =>
          t.id === task.id && data.data ? data.data : t,
        );
        setTasks(finalTasks);

        if (task && task.id === data.data.id) {
          setSelectedTask(data.data);
          sendWindowMessage(
            window,
            {
              type: "timeline-update",
              payload: data.data.id,
            },
            "*",
          );
        }
      }
    }
  };

  const currentCategory = categories.find((c) => c.id === task.category);

  return (
    <div className="flex flex-col gap-3">
      {!customTrigger && showLabel && (
        <Label variant={"subheading"}>Category</Label>
      )}

      <div className="flex flex-col gap-2">
        <ComboBox
          value={currentCategory?.id || ""}
          onValueChange={handleCategoryChange}
          open={open}
          onOpenChange={setOpen}
        >
          {customTrigger ? (
            <ComboBoxTrigger asChild>{customTrigger}</ComboBoxTrigger>
          ) : (
            <ComboBoxTrigger disabled={!editable} className={className}>
              <ComboBoxValue placeholder="Select category">
                {currentCategory ? (
                  <div className="flex items-center gap-2">
                    <RenderIcon
                      iconName={currentCategory.icon || "IconCircleFilled"}
                      size={12}
                      color={currentCategory.color || undefined}
                      raw
                    />
                    <span>{currentCategory.name}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <IconCategory className="h-4 w-4" />
                    <span>No Category</span>
                  </div>
                )}
              </ComboBoxValue>
              {showChevron && <ComboBoxIcon />}
            </ComboBoxTrigger>
          )}

          <ComboBoxContent>
            <ComboBoxSearch icon placeholder="Search categories..." />
            <ComboBoxList>
              <ComboBoxEmpty className="px-3 pt-3 flex flex-col items-center w-full">
                <div className="flex flex-col gap-1">
                  <Label>No categories found</Label>
                  <Link
                    to="/admin/settings/org/$orgId/categories"
                    params={{ orgId: task.organizationId }}
                  >
                    <Button variant="primary" size={"sm"} className="">
                      Create new
                    </Button>
                  </Link>
                </div>
              </ComboBoxEmpty>
              <ComboBoxGroup>
                {categories.map((cat) => (
                  <ComboBoxItem
                    key={cat.id}
                    value={cat.id}
                    searchValue={cat.name.toLowerCase()}
                  >
                    <div className="flex items-center gap-2">
                      <RenderIcon
                        iconName={cat.icon || "IconCircleFilled"}
                        size={12}
                        color={cat.color || undefined}
                        raw
                      />
                      <span>{cat.name}</span>
                    </div>
                  </ComboBoxItem>
                ))}
              </ComboBoxGroup>
            </ComboBoxList>
          </ComboBoxContent>
        </ComboBox>
      </div>
    </div>
  );
}

interface RenderCategoryProps {
  category: {
    id: string;
    name: string;
    color?: string | null;
    icon?: string | null;
  };
  showRemove?: boolean;
  onRemove?: (categoryId: string) => void;
  onClick?: (e: React.MouseEvent, categoryId: string) => void;
  className?: string;
}

export function RenderCategory({
  category,
  showRemove = false,
  onRemove,
  onClick,
  className = "",
}: RenderCategoryProps) {
  return (
    <Badge
      data-no-propagate
      key={category.id}
      variant="secondary"
      className={cn(
        "flex items-center justify-center gap-1 bg-accent ps-0 text-xs h-5 border border-border rounded-2xl truncate group/category cursor-pointer w-fit relative",
        showRemove && "pe-5",
        className,
      )}
      // style={{
      //   borderColor: category.color
      //     ? `hsla(${extractHslValues(category.color)}, 0.5)`
      //     : undefined,
      //   // background: category.color
      //   //   ? `hsla(${extractHslValues(category.color)}, 0.1)`
      //   //   : undefined,
      // }}
      onClick={onClick ? (e) => onClick(e, category.id) : undefined}
    >
      {/*<div className="shrink-0 absolute inset-y-0 flex items-center justify-center start-0 ps-1">
        <RenderIcon
          iconName={category.icon || "IconCircleFilled"}
          size={12}
          color={category.color || undefined}
          button
          className="size-3 [&_svg]:size-3"
        />
      </div>
      <span className="truncate">{category.name}</span>*/}
      <InlineLabel
        text={category.name}
        icon={
          <RenderIcon
            iconName={category.icon || "IconCategory"}
            size={12}
            color={category.color || undefined}
            raw
          />
        }
        className=""
      />
      {showRemove && onRemove && (
        <div className="shrink-0 absolute inset-y-0 flex items-center justify-center end-0 pe-1">
          <XIcon
            size={12}
            className="cursor-pointer hover:bg-muted rounded-sm shrink-0 opacity-0 group-hover/category:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(category.id);
            }}
          />
        </div>
      )}
    </Badge>
  );
}
