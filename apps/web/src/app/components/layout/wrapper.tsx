"use client";

import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { useAdminRoute } from "./admin/admin-navigation/useAdminRoute";
import { LeftSidebarProvider } from "./admin/left-sidebar";
import { PrimarySidebar } from "./admin/sidebars/primary";

interface Props {
	children: React.ReactNode;
	className?: string;
}
export function Wrapper({ children, className }: Props) {
	const { isTaskPage } = useAdminRoute();
	return (
		<div className="h-full w-full max-h-[calc(100dvh-var(--header-height))]!">
			<div className="flex flex-1 h-full w-full transition-all pb-2 pr-2">
				<PrimarySidebar />
				{/* <LeftSidebarProvider /> */}
				<div
					className={cn(
						"h-full overflow-y-auto w-full mx-auto flex flex-col rounded-2xl bg-background",
						isTaskPage && "pt-0 pr-0",
						className
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
	style?: "default" | "compact";
	title?: string;
}
export function SubWrapper({ children, className, style = "default", title = "title" }: SubProps) {
	return (
		<div className={cn("flex flex-col gap-3", style === "compact" && "max-w-prose mx-auto p-3 md:p-6", className)}>
			<Label variant={"heading"} className="text-2xl text-foreground">
				{title}
			</Label>
			{children}
		</div>
	);
}
