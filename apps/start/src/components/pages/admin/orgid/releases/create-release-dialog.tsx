import { createReleaseAction } from "@/lib/fetches/release";
import { useToastAction } from "@/lib/util";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { Button } from "@repo/ui/components/button";
import {
  AdaptiveDialog,
  AdaptiveDialogContent,
  AdaptiveDialogDescription,
  AdaptiveDialogFooter,
  AdaptiveDialogHeader,
  AdaptiveDialogTitle,
} from "@repo/ui/components/adaptive-dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@repo/ui/components/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import ColorPickerCustom from "@repo/ui/components/tomui/color-picker-custom";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useState } from "react";
import { motion } from "motion/react";
import RenderIcon from "@/components/generic/RenderIcon";
import IconPicker from "@/components/generic/icon-picker";
import Editor from "@/components/prosekit/editor";
import processUploads from "@/components/prosekit/upload";
import type { NodeJSON } from "prosekit/core";
import {
  IconArrowsDiagonal,
  IconArrowsDiagonalMinimize2,
  IconX,
} from "@tabler/icons-react";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";

interface CreateReleaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, blocks creating releases (plan limit). */
  disabled?: boolean;
  /** Message to show when creation is blocked by plan limits. */
  disabledMessage?: string;
}

const DIALOG_SIZES = {
  collapsed: {
    width: "min(38rem, calc(100vw - 2rem))",
    height: "auto",
    minHeight: "18rem",
    maxHeight: "min(38rem, calc(100vh - 4rem))",
  },
  expanded: {
    width: "min(50rem, calc(100vw - 2rem))",
    height: "min(40rem, calc(100vh - 6rem))",
    minHeight: "min(40rem, calc(100vh - 6rem))",
    maxHeight: "min(40rem, calc(100vh - 6rem))",
  },
  transition: {
    type: "tween" as const,
    ease: "easeInOut" as const,
    duration: 0.25,
  },
} as const;

export function CreateReleaseDialog({
  open,
  onOpenChange,
  disabled = false,
  disabledMessage,
}: CreateReleaseDialogProps) {
  const { organization, releases, setReleases } = useLayoutOrganization();
  const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
  const { runWithToast, isFetching } = useToastAction();
  const isMobile = useIsMobile();

  const [expand, setExpand] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [color, setColor] = useState({
    hsla: "hsla(217, 91%, 60%, 1)",
    hex: "#3B82F6",
  });
  const [icon, setIcon] = useState<string>("IconRocket");
  const [status, setStatus] = useState<
    "planned" | "in-progress" | "released" | "archived"
  >("planned");
  const [description, setDescription] = useState<NodeJSON | undefined>(
    undefined,
  );

  const resetForm = () => {
    setName("");
    setSlug("");
    setColor({ hsla: "hsla(217, 91%, 60%, 1)", hex: "#3B82F6" });
    setIcon("IconRocket");
    setStatus("planned");
    setDescription(undefined);
    setExpand(false);
  };

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) {
      return;
    }

    let uploadedDescription = description;
    if (description) {
      uploadedDescription = await processUploads(
        description,
        "public",
        organization.id,
        "create-release",
      );
    }

    const data = await runWithToast(
      "create-release",
      {
        loading: {
          title: "Creating release...",
          description: "Creating your new release.",
        },
        success: {
          title: "Release created",
          description: "Your release has been created successfully.",
        },
        error: {
          title: "Failed to create release",
          description: "An error occurred while creating your release.",
        },
      },
      () =>
        createReleaseAction(
          organization.id,
          {
            name,
            slug,
            color: color.hsla,
            icon,
            status,
            description: uploadedDescription,
          },
          sseClientId,
        ),
    );

    if (data?.success && data.data) {
      setReleases([...releases, data.data]);
      resetForm();
      onOpenChange(false);
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9-_.]/g, "-")
          .replace(/--+/g, "-")
          .replace(/^-|-$/g, ""),
      );
    }
  };

  return (
    <AdaptiveDialog open={open} onOpenChange={onOpenChange}>
      <AdaptiveDialogContent
        className={cn(
          "z-50 border",
          !isMobile && "md:max-w-none! md:w-auto! md:h-auto!",
          !isMobile && "top-[15%]! translate-y-0!",
        )}
        childClassName={cn(
          !isMobile && "flex flex-col min-h-0 overflow-hidden",
        )}
        showClose={false}
      >
        <motion.div
          className={cn(!isMobile && "flex flex-col")}
          initial={false}
          animate={{
            width: !isMobile
              ? expand
                ? DIALOG_SIZES.expanded.width
                : DIALOG_SIZES.collapsed.width
              : "100%",
          }}
          transition={DIALOG_SIZES.transition}
          style={{
            height: !isMobile
              ? expand
                ? DIALOG_SIZES.expanded.height
                : "auto"
              : "auto",
            minHeight: !isMobile
              ? expand
                ? DIALOG_SIZES.expanded.minHeight
                : DIALOG_SIZES.collapsed.minHeight
              : undefined,
            maxHeight: !isMobile
              ? expand
                ? DIALOG_SIZES.expanded.maxHeight
                : DIALOG_SIZES.collapsed.maxHeight
              : undefined,
            transition: !isMobile
              ? "height 0.25s ease-in-out, min-height 0.25s ease-in-out, max-height 0.25s ease-in-out"
              : undefined,
          }}
        >
          <AdaptiveDialogHeader className={cn(!isMobile && "pb-0!")}>
            <AdaptiveDialogTitle asChild>
              <div className="flex items-center gap-1 w-full">
                <div className="w-full flex items-center gap-1">
                  <InputGroup className="bg-transparent border-transparent w-4/5">
                    <InputGroupAddon align="inline-start" className="h-full">
                      <InputGroupButton asChild>
                        <Popover modal>
                          <PopoverTrigger asChild>
                            <Button
                              variant="accent"
                              className="h-auto w-auto p-0 border-transparent rounded-lg overflow-hidden"
                            >
                              <RenderIcon
                                iconName={icon}
                                color={color.hsla}
                                button
                                className="size-8 [&_svg]:size-5"
                              />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-64 md:w-96">
                            <div className="flex flex-col gap-3">
                              <div className="p-3">
                                <ColorPickerCustom
                                  onChange={setColor}
                                  value={color.hex}
                                  height={100}
                                />
                              </div>
                              <div className="px-3">
                                <IconPicker
                                  value={icon}
                                  update={(value: string): void => {
                                    setIcon(value);
                                  }}
                                />
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </InputGroupButton>
                    </InputGroupAddon>
                    <InputGroupInput
                      placeholder="Release name"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                  </InputGroup>
                  <InputGroup className="bg-transparent border-transparent w-1/5">
                    <InputGroupInput
                      id="release-slug"
                      placeholder="slug"
                      value={slug}
                      onChange={(e) =>
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-_.]/g, "-")
                            .replace(/--+/g, "-"),
                        )
                      }
                    />
                  </InputGroup>
                </div>
                <div className="flex items-center gap-1 ml-auto">
                  {!isMobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setExpand(!expand)}
                    >
                      {expand ? (
                        <IconArrowsDiagonalMinimize2 className="size-4" />
                      ) : (
                        <IconArrowsDiagonal className="size-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      resetForm();
                      onOpenChange(false);
                    }}
                  >
                    <IconX className="size-4" />
                  </Button>
                </div>
              </div>
            </AdaptiveDialogTitle>
            <AdaptiveDialogDescription className="sr-only">
              Create a new release
            </AdaptiveDialogDescription>
          </AdaptiveDialogHeader>

          <div className="relative flex-1 flex flex-col min-h-0">
            <div
              className={cn(
                "flex flex-col gap-3 w-full p-3",
                !isMobile && "flex-1 min-h-0 pt-0!",
              )}
            >
              <div
                className={cn(
                  "flex flex-col gap-3 w-full",
                  !isMobile && "flex-1 min-h-0",
                )}
              >
                {/* Description editor */}
                <div
                  className={cn(
                    "w-full transition-all bg-transparent rounded-lg px-3 py-2",
                    !isMobile && "flex-1 min-h-24 overflow-y-auto",
                  )}
                >
                  <Editor
                    onChange={setDescription}
                    categories={[]}
                    tasks={[]}
                    hideBlockHandle={true}
                    firstLinePlaceholder="Release description"
                  />
                </div>

                {/* Status */}
                <Select
                  value={status}
                  onValueChange={(val) => setStatus(val as typeof status)}
                >
                  <SelectTrigger id="release-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="released">Released</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <AdaptiveDialogFooter className="mt-auto bg-background flex flex-col! gap-2 shrink-0">
              <div className="flex items-center gap-2 w-full">
                {disabled && disabledMessage && (
                  <p className="text-xs text-destructive mr-auto self-center">
                    {disabledMessage}
                  </p>
                )}
                <p className="text-xs text-muted-foreground px-1">
                  {organization.slug}.{import.meta.env.VITE_ROOT_DOMAIN}
                  /releases/{slug || "..."}
                </p>
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="primary"
                    onClick={handleCreate}
                    disabled={
                      !name.trim() || !slug.trim() || isFetching || disabled
                    }
                    className="h-7 w-auto"
                  >
                    Create Release
                  </Button>
                </div>
              </div>
            </AdaptiveDialogFooter>
          </div>
        </motion.div>
      </AdaptiveDialogContent>
    </AdaptiveDialog>
  );
}
