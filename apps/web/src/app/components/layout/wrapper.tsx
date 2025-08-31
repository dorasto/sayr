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
			<div className="flex flex-1 h-full w-full transition-all">
				<LeftSidebarProvider />
				<div className={cn("h-full overflow-y-auto w-full mx-auto flex max-w-full flex-col", className)}>
					{children}
				</div>
			</div>
		</div>
	);
}
