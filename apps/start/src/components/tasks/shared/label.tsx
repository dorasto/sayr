"use client";

import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@repo/ui/components/input-group";
import ColorPickerCustom from "@repo/ui/components/tomui/color-picker-custom";
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
import {
  IconCircleFilled,
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
  IconPlus,
  IconTag,
} from "@tabler/icons-react";
import { XIcon } from "lucide-react";
import { useState } from "react";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useToastAction } from "@/lib/util";
import { createLabelAction } from "@/lib/fetches/organization";
import RenderIcon from "@/components/generic/RenderIcon";

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
  /** If true, shows an inline "Create label" form inside the combobox empty state */
  canCreateLabel?: boolean;
  /** Called with the full updated labels list after a new label is created */
  onLabelCreated?: (newLabels: schema.labelType[]) => void;
}

/** Compact inline create-label form rendered inside the ComboBoxEmpty slot */
function InlineCreateLabelForm({
  orgId,
  searchValue,
  onCreated,
}: {
  orgId: string;
  searchValue: string;
  onCreated: (newLabels: schema.labelType[]) => void;
}) {
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
  const { runWithToast, isFetching } = useToastAction();

  const [name, setName] = useState(searchValue);
  const [color, setColor] = useState({ hsla: "#F59E0B", hex: "#F59E0B" });
  const [visible, setVisible] = useState<"public" | "private">("public");

  // Keep name in sync with external searchValue changes (when the user keeps typing)
  // but only if the user hasn't manually edited the field
  const [userEdited, setUserEdited] = useState(false);
  const effectiveName = userEdited ? name : searchValue;

  const handleCreate = async () => {
    const data = await runWithToast(
      "create-label-inline",
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
          description: "An error occurred while creating the label.",
        },
      },
      () =>
        createLabelAction(
          orgId,
          {
            name: effectiveName,
            color: color.hsla,
            visible,
          },
          wsClientId,
        ),
    );

    if (data?.success && data.data) {
      onCreated(data.data);
      // Reset form state
      setName("");
      setUserEdited(false);
      setColor({ hsla: "#F59E0B", hex: "#F59E0B" });
      setVisible("public");
    }
  };

  return (
    <InputGroup className="h-auto bg-transparent border-transparent p-0">
      <InputGroupAddon align="inline-start" className="h-full">
        <InputGroupButton asChild>
          <Popover modal>
            <PopoverTrigger asChild>
              <Button
                variant="accent"
                className="h-8 w-8 p-0 border-transparent rounded-lg overflow-hidden [&_svg]:size-4!"
              >
                <RenderIcon
                  iconName="IconCircleFilled"
                  color={color.hsla}
                  button
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-64" side="bottom" align="center">
              <div className="p-3">
                <ColorPickerCustom
                  onChange={setColor}
                  defaultValue={color.hex}
                  height={100}
                />
              </div>
            </PopoverContent>
          </Popover>
        </InputGroupButton>
        <Tooltip>
          <TooltipTrigger asChild>
            <InputGroupButton
              size="sm"
              className={cn(
                "h-8 aspect-square border",
                visible === "public"
                  ? "border-transparent"
                  : "bg-primary/10 border-primary/50",
              )}
              variant="ghost"
              onClick={() =>
                setVisible(visible === "public" ? "private" : "public")
              }
            >
              {visible === "public" ? <IconEye /> : <IconEyeOff />}
            </InputGroupButton>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {visible === "public" ? "Visible to public" : "Hidden from public"}
          </TooltipContent>
        </Tooltip>
      </InputGroupAddon>
      <InputGroupInput
        placeholder="Create new label"
        value={effectiveName}
        onChange={(e) => {
          setName(e.target.value);
          setUserEdited(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && effectiveName.length > 0 && !isFetching) {
            e.preventDefault();
            handleCreate();
          }
        }}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          variant="primary"
          className="h-full rounded-lg"
          onClick={handleCreate}
          disabled={effectiveName.length === 0 || isFetching}
        >
          <IconPlus />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
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
  canCreateLabel = false,
  onLabelCreated,
}: GlobalTaskLabelsProps) {
  // Get current selected label IDs
  const currentLabelIds = task.labels?.map((label) => label.id) || [];
  const [searchValue, setSearchValue] = useState("");

  const handleLabelsChange = (values: string[]) => {
    if (onLabelsChange) {
      onLabelsChange(values);
    }
  };

  // Whether the empty state (no matching labels) should show the create form
  const showCreateForm = canCreateLabel && searchValue.trim().length > 0;

  const emptyContent = showCreateForm ? (
    <InlineCreateLabelForm
      orgId={task.organizationId}
      searchValue={searchValue.trim()}
      onCreated={(newLabels) => {
        setSearchValue("");
        onLabelCreated?.(newLabels);
      }}
    />
  ) : (
    "No labels found."
  );

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
    <div className={cn("flex flex-col gap-3", !compact && className)}>
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
                  className,
                )}
              >
                {task.labels?.length > 0 ? (
                  renderCompactLabels()
                ) : (
                  <IconTag size={14} className="text-muted-foreground" />
                )}
              </ComboBoxTrigger>
              <ComboBoxContent className="">
                <ComboBoxSearch
                  placeholder="Search labels..."
                  onValueChange={setSearchValue}
                />
                <ComboBoxList>
                  <ComboBoxEmpty>{emptyContent}</ComboBoxEmpty>
                  <ComboBoxGroup>
                    {availableLabels.map((label) => (
                      <ComboBoxItem
                        key={label.id}
                        value={label.id}
                        searchValue={label.name}
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full mr-2"
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
                  <ComboBoxSearch
                    placeholder="Search labels..."
                    onValueChange={setSearchValue}
                  />
                  <ComboBoxList>
                    <ComboBoxEmpty className="p-0">
                      {emptyContent}
                    </ComboBoxEmpty>
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
