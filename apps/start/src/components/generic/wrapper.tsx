"use client";

import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowLeft } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { PrimarySidebar } from "../admin/sidebars/primary";
import { SettingsSidebar } from "../admin/sidebars/settings";
import { StaffSidebar } from "../admin/sidebars/staff";
import { useAdminRoute } from "./useAdminRoute";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";

/**
 * Renders the correct sidebar based on the current route.
 * Placed at the root layout level so it spans full viewport height.
 */
export function AdminSidebar() {
  const { isSettingsPage, isStaffPage } = useAdminRoute();

  return isSettingsPage ? (
    <SettingsSidebar />
  ) : isStaffPage ? (
    <StaffSidebar />
  ) : (
    <PrimarySidebar />
  );
}

interface Props {
  children: React.ReactNode;
  className?: string;
}
export function Wrapper({ children, className }: Props) {
  const { isTaskPage } = useAdminRoute();
  const isMobile = useIsMobile();

  return (
    <div className="flex-1 min-h-0 w-full">
      <div
        className={cn(
          "flex flex-1 h-full w-full transition-all pb-2 pt-2 pr-2",
          isMobile && "p-0",
        )}
      >
        <div
          className={cn(
            "h-full overflow-y-auto w-full mx-auto flex flex-col rounded-2xl bg-background contain-layout",
            isTaskPage && "pt-0 pr-0",
            isMobile && "p-0",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

interface SubProps {
  children: React.ReactNode;
  className?: string;
  rootClassName?: string;
  style?: "default" | "compact";
  iconClassName?: string;
  title?: string;
  description?: string;
  descriptionRender?: React.ReactNode;
  icon?: React.ReactNode;
  backButton?: string;
  backButtonText?: string;
  blur?: boolean;
  top?: boolean;
  topContent?: React.ReactNode;
}
export function SubWrapper({
  children,
  className,
  rootClassName,
  iconClassName,
  style = "default",
  title,
  description,
  descriptionRender,
  icon,
  backButton,
  topContent,
  backButtonText = "Back",
  blur = true,
  top = true,
}: SubProps) {
  return (
    <div className={cn("relative", rootClassName)}>
      {top && (
        <div
          className={cn(
            "",
            blur
              ? "sticky top-0 z-50 w-full md:h-7 backdrop-blur bg-linear-to-b from-background from-5% via-background/30 via-30% to-background/0 flex items-center px-3 pt-3"
              : "",
          )}
        >
          {backButton ? (
            <Link to={backButton} className="">
              <Button
                variant={"ghost"}
                className="w-fit text-xs p-1 h-auto bg-accent md:bg-transparent rounded-lg"
                size={"sm"}
              >
                <IconArrowLeft className="size-3!" />
                <span className="">{backButtonText}</span>
              </Button>
            </Link>
          ) : (
            <Button
              variant={"ghost"}
              className="w-fit text-xs p-1 h-auto invisible"
              size={"sm"}
            >
              <IconArrowLeft className="size-3!" />
              <span className="hidden lg:block">Back</span>
            </Button>
          )}
        </div>
      )}
      <div
        className={cn(
          "flex flex-col gap-9 md:p-6 md:pt-0",
          style === "compact" && "max-w-prose mx-auto p-3 md:pt-0",
          className,
        )}
      >
        <div className="flex items-center gap-3 justify-between">
          {title && (
            <div className="flex flex-col">
              {icon ? (
                <div className="flex gap-2">
                  <div
                    className={cn(
                      "bg-accent p-1 rounded-lg [&_svg]:size-10! h-fit",
                      iconClassName,
                    )}
                  >
                    {icon}
                  </div>
                  <div className="flex flex-col">
                    <Label
                      variant={"heading"}
                      className="text-2xl text-foreground"
                    >
                      {title}
                    </Label>
                    {description && (
                      <Label
                        variant={"subheading"}
                        className="text-muted-foreground"
                      >
                        {description}
                      </Label>
                    )}
                    {descriptionRender && <div>{descriptionRender}</div>}
                  </div>
                </div>
              ) : (
                <Label variant={"heading"} className="text-2xl text-foreground">
                  {title}
                </Label>
              )}

              {!icon && description && (
                <Label variant={"subheading"} className="text-muted-foreground">
                  {description}
                </Label>
              )}
            </div>
          )}
          {topContent && topContent}
        </div>
        {children}
      </div>{" "}
    </div>
  );
}
