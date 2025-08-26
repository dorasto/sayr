"use client";

import { cn } from "@repo/ui/lib/utils";
import { LeftSidebarProvider } from "./left-sidebar";

interface Props {
	children: React.ReactNode;
	className?: string;
}
export function Wrapper({ children, className }: Props) {
	return (
		<div className="h-full w-full max-h-(calc(100dvh-var(--header-height)))!">
			<div className="flex gap-1 flex-1 h-full w-full transition-all">
				<LeftSidebarProvider />
				<div
					className={cn(
						"h-full overflow-y-auto min-w-full mx-auto flex max-w-screen-2xl flex-col gap-4 p-3",
						className
					)}
				>
					{children}
				</div>
			</div>
		</div>
	);
}
