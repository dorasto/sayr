import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@repo/ui/components/resizable";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import { Outlet } from "@tanstack/react-router";

export default function OrganizationTaskIdPage() {
	const useMobile = useIsMobile();
	return (
		<div className="relative flex flex-col h-full max-h-full">
			<div className="sticky top-0 z-20 bg-background flex items-center gap-2 p-2">
				stuck
			</div>
			<ResizablePanelGroup direction="horizontal">
				<ResizablePanel defaultSize={useMobile ? 100 : 70} minSize={70}>
					<div
						className={cn(
							"flex-1 overflow-y-auto h-full flex flex-col relative px-2",
						)}
					>
						<Outlet />
					</div>
				</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={30} minSize={30} maxSize={100}>
					<div className="flex-1 overflow-y-auto h-full flex flex-col relative px-2">
						Side Panel
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}
