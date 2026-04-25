import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { ButtonGroup } from "@repo/ui/components/button-group";
import { Badge } from "@repo/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Toggle } from "@repo/ui/components/toggle";
import {
  AdaptiveDialog,
  AdaptiveDialogContent,
  AdaptiveDialogDescription,
  AdaptiveDialogFooter,
  AdaptiveDialogHeader,
  AdaptiveDialogTitle,
} from "@repo/ui/components/adaptive-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import { getDisplayName } from "@repo/util";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { IconLock, IconLockOpen2, IconX } from "@tabler/icons-react";
import { lazy, Suspense, useState } from "react";
import { motion } from "motion/react";
import { type Health, type Visibility, healthConfig } from "./types";

const Editor = lazy(() => import("@/components/prosekit/editor"));

interface PostUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: schema.UserSummary | null | undefined;
  availableUsers: schema.UserSummary[];
  onPost: (
    content: schema.NodeJSON,
    health: Health,
    visibility: Visibility,
  ) => Promise<void>;
}

const DIALOG_SIZES = {
  width: "min(42rem, calc(100vw - 2rem))",
  height: "auto",
  minHeight: "20rem",
  maxHeight: "min(36rem, calc(100vh - 4rem))",
  transition: {
    type: "tween" as const,
    ease: "easeInOut" as const,
    duration: 0.2,
  },
} as const;

export function PostUpdateDialog({
  open,
  onOpenChange,
  account,
  availableUsers,
  onPost,
}: PostUpdateDialogProps) {
  const isMobile = useIsMobile();
  const [health, setHealth] = useState<Health>("on_track");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [content, setContent] = useState<schema.NodeJSON | undefined>();
  const [editorKey, setEditorKey] = useState(0);
  const [isPosting, setIsPosting] = useState(false);

  const displayName = account ? getDisplayName(account) : "You";

  const resetForm = () => {
    setContent(undefined);
    setHealth("on_track");
    setVisibility("public");
    setEditorKey((k) => k + 1);
  };

  const handlePost = async () => {
    if (!content) return;
    setIsPosting(true);
    try {
      await onPost(content, health, visibility);
      resetForm();
    } finally {
      setIsPosting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
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
          animate={{ width: !isMobile ? DIALOG_SIZES.width : "100%" }}
          transition={DIALOG_SIZES.transition}
          style={{
            height: "auto",
            minHeight: !isMobile ? DIALOG_SIZES.minHeight : undefined,
            maxHeight: !isMobile ? DIALOG_SIZES.maxHeight : undefined,
          }}
        >
          <AdaptiveDialogHeader className={cn(!isMobile && "pb-0!")}>
            <AdaptiveDialogTitle asChild>
              <div className="flex items-center gap-3 w-full">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1 text-xs cursor-pointer border",
                        healthConfig[health].className,
                      )}
                    >
                      {healthConfig[health].icon} {healthConfig[health].label}
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {(["on_track", "at_risk", "off_track"] as Health[]).map(
                      (h) => (
                        <DropdownMenuItem
                          key={h}
                          onClick={() => setHealth(h)}
                          className={cn(
                            "flex items-center gap-2",
                            healthConfig[h].className,
                            "bg-transparent! hover:bg-accent!",
                          )}
                        >
                          {healthConfig[h].icon} {healthConfig[h].label}
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* visibility */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1 text-xs cursor-pointer border",
                        // healthConfig[health].className,
                      )}
                    >
                      {visibility === "internal" ? (
                        <>
                          <IconLock size={14} />
                          <span>Internal only</span>
                        </>
                      ) : (
                        <>
                          <IconLockOpen2 size={14} />
                          <span>Public</span>
                        </>
                      )}
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {(["public", "internal"] as Visibility[]).map((v) => (
                      <DropdownMenuItem
                        key={v}
                        onClick={() => setVisibility(v)}
                        className={cn(
                          "flex items-center gap-2",
                          // v === "internal" ? "bg-internal!" : "",
                          // "bg-transparent! hover:bg-accent!",
                        )}
                      >
                        {v === "internal" ? (
                          <>
                            <IconLock size={14} />
                            <span>Internal only</span>
                          </>
                        ) : (
                          <>
                            <IconLockOpen2 size={14} />
                            <span>Public</span>
                          </>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 ml-auto"
                  onClick={handleClose}
                >
                  <IconX className="size-4" />
                </Button>
              </div>
            </AdaptiveDialogTitle>
            <AdaptiveDialogDescription className="sr-only">
              Post a status update for this release
            </AdaptiveDialogDescription>
          </AdaptiveDialogHeader>

          <div className="flex flex-col flex-1 min-h-0 p-3 pt-2 gap-3">
            {/* Health picker */}
            <div className="flex items-center gap-2"></div>

            {/* Editor */}
            <div className="flex items-start gap-2 flex-1 min-h-0">
              <Avatar className="h-6 w-6 shrink-0 rounded-full mt-1">
                <AvatarImage
                  src={account?.image || "/avatar.jpg"}
                  alt={displayName}
                />
                <AvatarFallback className="rounded-full bg-muted text-[10px] uppercase">
                  {displayName.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <Suspense
                  fallback={
                    <div className="h-16 animate-pulse bg-muted rounded" />
                  }
                >
                  <Editor
                    key={editorKey}
                    onChange={setContent}
                    hideBlockHandle
                    firstLinePlaceholder="What's the current status of this release?"
                    mentionViewUsers={availableUsers}
                    submit={handlePost}
                  />
                </Suspense>
              </div>
            </div>
          </div>

          <AdaptiveDialogFooter className="mt-auto bg-background shrink-0">
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {visibility === "internal" ? (
                  <>
                    <IconLock size={12} />
                    <span>Internal only</span>
                  </>
                ) : (
                  <>
                    <IconLockOpen2 size={12} />
                    <span>Visible publicly</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <ButtonGroup>
                  <Button
                    variant="primary"
                    size="sm"
                    className="h-7"
                    disabled={!content || isPosting}
                    onClick={handlePost}
                  >
                    Create
                    {/*<IconArrowBack className="size-3.5" />*/}
                  </Button>
                  {/*<Toggle
                    aria-label="Toggle visibility"
                    size="sm"
                    className="h-7 border-0 bg-accent hover:bg-secondary"
                    variant="primary"
                    pressed={visibility === "internal"}
                    onPressedChange={(pressed) =>
                      setVisibility(pressed ? "internal" : "public")
                    }
                  >
                    {visibility === "internal" ? (
                      <IconLock className="size-3.5" />
                    ) : (
                      <IconLockOpen2 className="size-3.5" />
                    )}
                  </Toggle>*/}
                </ButtonGroup>
              </div>
            </div>
          </AdaptiveDialogFooter>
        </motion.div>
      </AdaptiveDialogContent>
    </AdaptiveDialog>
  );
}
