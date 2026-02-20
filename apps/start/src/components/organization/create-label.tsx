"use client";
import { useToastAction } from "@/lib/util";
import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@repo/ui/components/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import ColorPickerCustom from "@repo/ui/components/tomui/color-picker-custom";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import {
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import RenderIcon from "../generic/RenderIcon";
import {
  createLabelAction,
  deleteLabelAction,
  editLabelAction,
} from "@/lib/fetches/organization";

interface Props {
  orgId: string;
  setLabels: (newValue: schema.labelType[]) => void;
  label?: schema.labelType;
  mode?: "create" | "edit";
  taskCount?: number;
  onLabelClick?: (labelId: string) => void;
  settingsUI?: boolean;
}

export default function CreateLabel({
  orgId,
  setLabels,
  label,
  mode = "create",
  taskCount = 0,
  onLabelClick,
  settingsUI = false,
}: Props) {
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
  const [name, setName] = useState(label?.name || "");
  const [color, setColor] = useState({
    hsla: label?.color || "#F59E0B",
    hex: label?.color || "#F59E0B",
  });
  const [visible, setVisible] = useState<"public" | "private">(
    label?.visible ?? "public",
  );
  const { runWithToast, isFetching } = useToastAction();
  const isEditMode = mode === "edit" && label;
  const change =
    name !== label?.name ||
    color.hsla !== label?.color ||
    visible !== (label?.visible ?? "public");

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  useEffect(() => {
    if (isEditMode) {
      setName(label?.name || "");
      setColor({
        hsla: label?.color || "#F59E0B",
        hex: label?.color || "#F59E0B",
      });
    }
  }, [isEditMode, label?.color, label?.name]);

  // Keep visible state in sync with label prop
  useEffect(() => {
    setVisible(label?.visible ?? "public");
  }, [label?.visible]);
  return (
    <div className="h-auto">
      <InputGroup
        className={cn(
          "h-auto bg-accent border-transparent group/group",
          settingsUI && "bg-card flex items-center gap-1 ",
        )}
      >
        <InputGroupAddon align="inline-start" className="h-full">
          <InputGroupButton asChild>
            <Popover modal>
              <PopoverTrigger asChild>
                <Button
                  variant={"accent"}
                  className="h-auto w-auto p-0 border-transparent rounded-lg overflow-hidden"
                >
                  <RenderIcon
                    iconName={"IconCircleFilled"}
                    color={color.hsla}
                    button
                    className={cn(settingsUI && "size-8 [&_svg]:size-5")}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-64">
                <div className="flex flex-col gap-3">
                  <div className="p-3">
                    <ColorPickerCustom
                      onChange={setColor}
                      defaultValue={color.hex}
                      height={100}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </InputGroupButton>
          <Tooltip>
            <TooltipTrigger asChild>
              <InputGroupButton
                size={"sm"}
                className={cn(
                  "h-8 aspect-square border",
                  visible === "public"
                    ? "border-transparent"
                    : "bg-primary/10 border-primary/50",
                )}
                variant={"ghost"}
                onClick={() =>
                  setVisible(visible === "public" ? "private" : "public")
                }
              >
                {visible === "public" ? (
                  <IconEye className="" />
                ) : (
                  <IconEyeOff className="" />
                )}
              </InputGroupButton>
            </TooltipTrigger>
            <TooltipContent side="right">
              {visible === "public"
                ? "Visible to public"
                : "Hidden from public"}
            </TooltipContent>
          </Tooltip>
        </InputGroupAddon>
        <InputGroupInput
          className={cn(
            "",
            settingsUI && "hover:bg-accent focus-within:bg-accent h-8",
          )}
          placeholder="Create new label"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {isEditMode ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground h-auto py-1 px-2 cursor-pointer hover:text-foreground"
              onClick={() => {
                if (onLabelClick && label) {
                  onLabelClick(label.id);
                }
              }}
              disabled={!onLabelClick}
            >
              {taskCount} {taskCount === 1 ? "task" : "tasks"}
            </InputGroupButton>
          </InputGroupAddon>
        ) : (
          <InputGroupAddon align="inline-end" className="invisible">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground h-auto py-1 px-2 cursor-pointer hover:text-foreground"
            >
              {taskCount} {taskCount === 1 ? "task" : "tasks"}
            </Button>
          </InputGroupAddon>
        )}

        {/* ------- Create Mode ------- */}
        {!isEditMode ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              variant="ghost"
              className="h-full"
              onClick={async () => {
                const data = await runWithToast(
                  "create-label",
                  {
                    loading: {
                      title: "Creating label...",
                      description: "Please wait while we create the label.",
                    },
                    success: {
                      title: "Label created",
                      description: "The label has been successfully created.",
                    },
                    error: {
                      title: "Failed to create label",
                      description:
                        "An error occurred while creating the label.",
                    },
                  },
                  () =>
                    createLabelAction(
                      orgId,
                      {
                        name,
                        color: color.hsla,
                        visible,
                      },
                      wsClientId,
                    ),
                );
                if (data?.success && data.data) {
                  setLabels(data.data);
                  setName("");
                  setColor({
                    hsla: "#000000",
                    hex: "#000000",
                  });
                  setVisible("public");
                }
              }}
              disabled={name.length === 0 || isFetching}
            >
              <IconDeviceFloppy />
            </InputGroupButton>
          </InputGroupAddon>
        ) : (
          /* ------- Edit Mode ------- */
          <InputGroupAddon align="inline-end" className={cn("")}>
            {change ? (
              <InputGroupButton
                variant="ghost"
                className={cn(
                  "h-full bg-success/30 hover:bg-success/50 rounded-lg",
                )}
                onClick={async () => {
                  const data = await runWithToast(
                    "edit-label",
                    {
                      loading: {
                        title: "Updating label...",
                        description: "Please wait while we update the label.",
                      },
                      success: {
                        title: "Label updated",
                        description: "The label has been successfully updated.",
                      },
                      error: {
                        title: "Failed to update label",
                        description:
                          "An error occurred while updating the label.",
                      },
                    },
                    () =>
                      editLabelAction(
                        orgId,
                        {
                          id: label?.id,
                          name,
                          color: color.hsla,
                          visible,
                        },
                        wsClientId,
                      ),
                  );
                  if (data?.success && data.data) {
                    setLabels(data.data);
                    const updatedLabel = data.data.find(
                      (e) => e.id === label?.id,
                    );
                    setName(updatedLabel?.name || "");
                    setColor({
                      hsla: updatedLabel?.color || "#000000",
                      hex: updatedLabel?.color || "#000000",
                    });
                    setVisible(updatedLabel?.visible ?? "public");
                  }
                }}
                disabled={isFetching}
              >
                <IconDeviceFloppy className="text-foreground" />
              </InputGroupButton>
            ) : (
              <Popover
                open={confirmDeleteOpen}
                onOpenChange={setConfirmDeleteOpen}
              >
                <PopoverTrigger asChild>
                  <InputGroupButton
                    variant="ghost"
                    className={cn(
                      "h-full",
                      settingsUI &&
                        "opacity-0 group-hover/group:opacity-100 transition-all",
                    )}
                  >
                    <IconTrash />
                  </InputGroupButton>
                </PopoverTrigger>
                <PopoverContent className="p-4 w-60 flex flex-col gap-3 bg-card border border-muted shadow-md">
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete this category?
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDeleteOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        const data = await runWithToast(
                          "delete-label",
                          {
                            loading: {
                              title: "Deleting label...",
                              description:
                                "Please wait while we delete the label.",
                            },
                            success: {
                              title: "Label deleted",
                              description:
                                "The label has been successfully deleted.",
                            },
                            error: {
                              title: "Failed to delete label",
                              description:
                                "An error occurred while deleting the label.",
                            },
                          },
                          () =>
                            deleteLabelAction(
                              orgId,
                              {
                                id: label?.id,
                              },
                              wsClientId,
                            ),
                        );
                        if (data?.success && data.data) {
                          setConfirmDeleteOpen(false);
                          setLabels(data.data);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </InputGroupAddon>
        )}
      </InputGroup>
    </div>
  );
}
