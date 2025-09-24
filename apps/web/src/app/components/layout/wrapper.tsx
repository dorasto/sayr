"use client";

import { cn } from "@repo/ui/lib/utils";
import { LeftSidebarProvider } from "./admin/left-sidebar";

interface Props {
	children: React.ReactNode;
	className?: string;
}
export function Wrapper({ children, className }: Props) {
	return (
		<div className="h-full w-full max-h-[calc(100dvh-var(--header-height))]!">
			<div className="flex flex-1 h-full w-full transition-all pb-2 pr-2">
				<LeftSidebarProvider />
				<div
					className={cn(
						"h-full overflow-y-auto w-full mx-auto flex flex-col px-4 pt-4 rounded-2xl bg-background",
						className
					)}
				>
					{children}
				</div>
			</div>
		</div>
	);
}
